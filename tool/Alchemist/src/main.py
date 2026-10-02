import os
import json
import argparse
import pandas as pd
import argcomplete
import pandas as pd
from dotenv import load_dotenv
import shutil
import time
from datetime import datetime
#Internal
from testInterface import *
from promptGenerator import *
from utils import *

load_dotenv()
hypothesis_loopSize = int(os.getenv("HYP_LOOP")) #Default is 2
fix_loopSize = int(os.getenv("FIX_LOOP")) #Default is 1
mutantNbre = int(os.getenv("MAX_MUTANTS"))

def create_dataset(mutations_path, dataset_path):
    """
    Generates a dataset starting from the ./<project_name>/mutations.json.
    :mutations_path: path to the ./<project_name>/llm_artifacts/mutations.json.
    :dataset_path: path where the dataset will be saved (./<project_name>/llm_artifacts/dataset_code.csv)    
    """
    
    # Load the mutations results from the JSON file in the ./<project_name>/llm_aritfacts folder
    with open(mutations_path, 'r', encoding='utf-8') as file:
        mutations_results_json = json.load(file)

    # Create an empty list to store mutation details
    data = [] 
  
    # Iterate through the contracts in the JSON file
    for contract_name, mutations in mutations_results_json.items():
        for mutation in mutations:       
            minified_original = minify_code(mutation['original'])
            minified_replacement = minify_code(mutation['replace'])
             
            # Append the relevant information for each mutation to the data list
            data.append({
                "Mutant_id": mutation["id"],
                "Contract_id": contract_name,
                "Test_id": mutation["mostCoveringTestFile"],                
                "Function_name": mutation["functionName"],  # Added the function name
                "Status": mutation["status"],
                "Original": mutation["original"],
                "Replacement": mutation["replace"],
                "Diff": minify_code(mutation["diff"]),
                "StartLine": mutation["startLine"],
                "Details": f'Mutant {mutation["id"]} of function {mutation["functionName"]} replaces {minified_original} with {minified_replacement}',
                "Contract_Context": minify_code(mutation["codeContext"]),
                "Test_Context": minify_code(mutation["testSetup"]),
                "Test_Generated": False,
                "KilledByLLM": False
            })

    mutants_code = pd.DataFrame(data)

    if not os.path.exists(os.path.join(os.getcwd(), "datasets")):
        os.makedirs(os.path.join(os.getcwd(), "datasets"))

    mutants_code.to_csv(dataset_path, index=False)

    print("Mutants dataset saved to folder:", dataset_path)  
     
    
    
def runPretestAndFix(model:str, test_file_path: str, mutant: dict, dataset: pd.DataFrame, executions_path:str, sut_path: str, project_test_dir: str, generated_tests_dir: str, error_tests_dir: str, correct_tests_dir: str, interactions_dir:str):
    """
    Run sumo pretest on a given test file. If pretets fails, tries to fix the test case file (until max attempts is reached). 

    :param test_file_path: the path to the test file to be run in the SUT
    :model: the model name
    :mutant: mutant for which the test file was generated    
    :param dataset: the mutant dataset
    :param executions_path: the path to the executions log    
    :param sut_path: the directory of the SUT    
    :param project_test_dir: the test directory of the SUT        
    :param generated_tests_dir: path to folder containing the generated tests
    :param error_tests_dir: path to folder containing the erroneous tests    
    :param correct_tests_dir: path to folder containing the corrected tests        
    :param interactions_dir: the name of the dir where interactions are saved  
            
    :return: True if pretest passed, False otherwise   
             The path to the test file that was pretested          
    """   
    fix_counter = 0
    pretest_counter = 1
    
    #Pretest original test file
    pretest_successfull = runPretest(test_file_path, mutant, pretest_counter, dataset, executions_path, sut_path, error_tests_dir, correct_tests_dir)
      
    while (fix_counter < fix_loopSize and not pretest_successfull):
        #pretest has failed - try to fix test
        fix_counter +=1
        pretest_counter +=1      
                  
        #Generate fixed test case
        start_time = time.time()              
        test_file_path, test_code = fixTest(model, mutant, dataset, fix_counter, test_file_path, project_test_dir, generated_tests_dir, interactions_dir)          
        elapsed_time = round(time.time() - start_time, 2)                           
        log_execution(executions_path, mutant['Mutant_id'],  mutant['Contract_id'], mutant['Test_id'], mutant['Function_name'], f"Generate-Fixed-Test", fix_counter, test_file_path, elapsed_time, (test_file_path is not None))      
                
        if test_file_path is None:
            print("## ERROR while generating fixed test case - pretest skipped.")  
            break              
        
        pretest_successfull = runPretest(test_file_path, mutant, pretest_counter, dataset, executions_path, sut_path, error_tests_dir, correct_tests_dir)
             
             
    return pretest_successfull, test_file_path
 
 
def runPretest(test_file_path: str, mutant: dict, pretest_counter:int, dataset: pd.DataFrame, executions_path:str, sut_path: str, error_tests_dir: str, correct_tests_dir: str) -> bool: 
    """
    Run sumo pretest on a given test file. 

    :param test_file_path: the path to the test file to be run in the SUT
    :mutant: mutant for which the test file was generated  
    :pretest_counter: pretest attempt counter      
    :param dataset: the mutant dataset
    :param executions_path: the path to the executions log    
    :param sut_path: the directory of the SUT        
    :param error_tests_dir: path to folder containing the erroneous tests    
    :param correct_tests_dir: path to folder containing the correct tests        
            
    :return: True if pretest passed, False otherwise         
    """   
    
    #Pretest original test file
    print(f"## Running PRETEST for {test_file_path}")  
      
    start_time = time.time()      
    pretest_outcome = run_sumo_pretest(test_file_path, sut_path)
    elapsed_time = round(time.time() - start_time, 2)   
    log_execution(executions_path, mutant['Mutant_id'], mutant['Contract_id'], mutant['Test_id'], mutant['Function_name'], f"SuMo-Pretest", pretest_counter, test_file_path, elapsed_time, (pretest_outcome == "True"))      
      
    if pretest_outcome == "True":  
            print("### Pretest PASSED. ")    
            shutil.copy(test_file_path, correct_tests_dir)
            dataset.loc[dataset['Mutant_id'] == mutant['Mutant_id'], 'Test_errors']= 'compiled correctly' 
            return True 
    else:     
            print("### Pretest FAILED.")                                                                          
            dataset.loc[dataset['Mutant_id'] == mutant['Mutant_id'], 'Test_errors'] = json.dumps(str(pretest_outcome).replace("\n", " "))
            shutil.copy(test_file_path, error_tests_dir)  
            return False           
                
 
def launchExperiment(model:str, sut_path:str, project_test_dir:str, results_path:str, dataset_path:str, executions_path:str):
    """
    Launch the test generation experiment.
    :model: the model to be used (llama, gpt-4o or gpt-4o-mini)   
    :sut_path: project folder path
    :project_test_dir: test folder path    
    :results_path: workspace results path
    :dataset_path: mutant dataset path    
    :executions_path: experiment executions dataset path            
    """
        
    # Define directories for results with the timestamped base directory
    results_dirs = {
        'interactions': os.path.join(results_path, "interactions"),
        'generated_tests': os.path.join(results_path, "generated_tests"),
        'error_tests': os.path.join(results_path, "generated_tests", "error_tests"),
        'correct_tests': os.path.join(results_path, "generated_tests", "correct_tests"),
        'killer_tests': os.path.join(results_path, "generated_tests", "killer_tests")
    }

    for dir_path in results_dirs.values():
        os.makedirs(dir_path, exist_ok=True)
    
    #delete previously generated test files    
    delete_generated_tests_from_SUT(project_test_dir)

    # Initialize the executions log
    pd.DataFrame(columns=['Mutant_id', 'Contract_id', 'Test_id', 'Function_name',  'Phase', 'Attempt', 'Artefact', 'Time', 'Result']).to_csv(executions_path, index=False)

    # Load the dataset and filter live mutants
    dataset = pd.read_csv(dataset_path)
    live_mutants = dataset[(dataset["Status"] == "live") & (dataset['Test_Generated'] == False)].head(mutantNbre)
    
    
    # Process each live mutant
    for index, mutant in live_mutants.iterrows():
        mutant_id = mutant['Mutant_id']
        contract_id = mutant['Contract_id']           
        test_id = mutant['Test_id']
        function_name = mutant['Function_name']
      
        print("\n************************************")                    
        print(f"## {index}/{len(dataset)} - Processing mutant {mutant['Mutant_id']} for contract {contract_id} and test file {test_id}")      
        print("************************************")                    
        
        # Initialize history and counter
        hypothesis_counter = 0   
        history = init_history()
        mutant_status = "live"
            
        last_hypothesis = ""
        
        #Generate new hypotheses and experiment until mutant is killed or max attempts are reached
        while (hypothesis_counter < hypothesis_loopSize and mutant_status == "live"):     
                        
            hypothesis_counter += 1
            
            # Generate the initial hypothesis
            if hypothesis_counter == 1:
                start_time = time.time()
                hypothesis_id, hypothesis, history = gen_hypothesis(model, mutant, hypothesis_counter, results_dirs['interactions'], [], "")
                last_hypothesis = hypothesis
                elapsed_time = round(time.time() - start_time, 2)
                log_execution(executions_path, mutant_id, contract_id, test_id, function_name, "Generate-Hypothesis", hypothesis_counter, hypothesis_id, elapsed_time, (hypothesis is not None))
            else:
                #break
                #Trim history until previously rejected hypothesis
                start_time = time.time()                
                cutoff = 2 * hypothesis_counter
                history = trim_history_first(history, cutoff) 
                hypothesis_id, hypothesis, history = gen_hypothesis(model, mutant, hypothesis_counter, results_dirs['interactions'], history, last_hypothesis)
                last_hypothesis = hypothesis                                                     
                elapsed_time = round(time.time() - start_time, 2)                                    
                log_execution(executions_path, mutant_id, contract_id, test_id, function_name, f"Generate-Hypothesis", hypothesis_counter, hypothesis_id, elapsed_time, (hypothesis is not None))                        

            if hypothesis is None:
                print("## ERROR while generating hypothesis - Skipping to next mutant")
                break                          
            
            
            # Generate test code based on the hypothesis
            start_time = time.time()
            test_file_path_in_SUT, test_file_code, history = gen_experiment(model, mutant, hypothesis_counter, project_test_dir, results_dirs['generated_tests'], results_dirs['interactions'], history)
            elapsed_time = round(time.time() - start_time, 2)
            dataset.loc[dataset['Mutant_id'] == mutant_id, 'Generated_test'] = test_file_code.replace("\n", " ")
            mutant['Generated_test'] = test_file_code.replace("\n", " ")
            log_execution(executions_path, mutant_id, contract_id, test_id, function_name, "Generate-Test", hypothesis_counter, test_file_path_in_SUT, elapsed_time, (test_file_path_in_SUT is not None))

            if test_file_path_in_SUT is None:
                print("## ERROR while generating test for mutant - Skipping to next mutant")
                break


            # Run pretest and fix the generated test
            pretest_successful, test_file_path_in_SUT = runPretestAndFix(model, test_file_path_in_SUT, mutant, dataset, executions_path, sut_path, project_test_dir, results_dirs['generated_tests'], results_dirs['error_tests'], results_dirs['correct_tests'], results_dirs['interactions'])

            if pretest_successful:
                # Run the actual test
                start_time = time.time()
                test_outcome = run_sumo_drytest(mutant_id, test_file_path_in_SUT, sut_path)
                elapsed_time = round(time.time() - start_time, 2)
                log_execution(executions_path, mutant_id, contract_id, test_id, function_name, "SuMo-Test", hypothesis_counter, test_file_path_in_SUT, elapsed_time, test_outcome)

                if test_outcome == "killed":
                    print("### Mutant was KILLED - Testing next mutant")
                    mutant_status = "killed"
                    dataset.loc[dataset['Mutant_id'] == mutant_id, 'KilledByLLM'] = True
                    dataset.loc[dataset['Mutant_id'] == mutant_id, 'Status'] = "killed"
                    copy_file(test_file_path_in_SUT, results_dirs['killer_tests'])
            else:
                print("### Test could not be fixed after MAX_ATTEMPTS - Skipping to next mutant")
                break      
        
        dataset.to_csv(dataset_path, index=False)
 
def log_execution(executions_path, mutant_id, contract_id, test_id, function_name, phase, attempt, artefact, time, result):
       # Get executions log
       executions = pd.read_csv(executions_path)  
       mutant_execution= {'Mutant_id': mutant_id,  'Contract_id': contract_id, 'Test_id': test_id, "Function_name": function_name,  'Phase': phase, 'Attempt': attempt, 'Artefact': artefact, 'Time': time, 'Result': result}  
       executions.loc[len(executions)] = mutant_execution
       executions.to_csv(executions_path, index=False)    
                       
def getWorkspacePaths(sut_path:str, model:str) -> tuple[str, str, str, str]:
    """
    Sets up the workspace for a given project folder. 
    :sut_path (str): The path to the project folder.
    :model (str): The used model.    

    :return: Tuple[str, str]: A tuple containing the workspace paths.
    """

    project_name = sut_path.split('/')[-1]
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    #workspace paths    
    workspace = os.path.join(os.getcwd(), project_name)
    results_path = os.path.join(workspace, f"results_{model}_{timestamp}")
    # NOTE on mutation operators: the Alchemist paper reports the operator set
    # RRI ORFD SVR EED MOD SKID EHD CER PLR BOR ISD NVR RSD CSC AVR GVR MCR,
    # but the public SuMo release does not implement all of these operators; the
    # paper apparently used a customized SuMo build that was never published. The
    # pre-generated mutants consumed from sumo_artifacts/ below are therefore
    # produced with the operators the public SuMo release does support.
    sumo_artifacts_path = os.path.join(workspace, f"sumo_artifacts")    

    #SUT paths
    dataset_path= os.path.join(sumo_artifacts_path, 'mutationsDataset.csv')
    mutations_path= os.path.join(sumo_artifacts_path, 'mutations.json')        
    executions_path= os.path.join(results_path, 'executions.csv')    
    sut_test_dir_path = os.path.join(sut_path, 'test')    
    
    # Check if the tes directory exists in the SUT       
    if not os.path.isdir(sut_test_dir_path):
        print(f"The provided SUT test path '{sut_test_dir_path}' is not a valid directory.")
        return
    
    if not os.path.exists(workspace):
            os.makedirs(workspace)
    if not os.path.exists(results_path):
        os.makedirs(results_path)      
    if not os.path.exists(sumo_artifacts_path):
        os.makedirs(sumo_artifacts_path)                      
    
    return results_path, executions_path, dataset_path, mutations_path, sut_test_dir_path    

def copySuMoArtifactsToResults(sut_path:str, results_path:str):
    """
    Copy the sumo artifacts in ./project_name/sumo_artifacts to the project's result directory 
    :sut_path (str): The path to the project folder.
    :results_path (str): The path to the results dir.    
    """

    project_name = sut_path.split('/')[-1]
    
    #workspace paths    
    workspace = os.path.join(os.getcwd(), project_name)
    sumo_artifacts_path = os.path.join(workspace, f"sumo_artifacts")    

    #SUT paths
    dataset_path= os.path.join(sumo_artifacts_path, 'mutationsDataset.csv')
    mutations_path= os.path.join(sumo_artifacts_path, 'mutations.json')        

    #copy sumo artifacts into the results folder
    shutil.copy(mutations_path, results_path)     
    shutil.copy(dataset_path, results_path) 
                      

def main():
    parser = argparse.ArgumentParser(description='generate dataset and perform mutation testing.')
    parser.add_argument('sut_path', type=str, help='path to the SUT (e.g.: ./case_studies/myProject)')
    parser.add_argument('model', type=str, default=None, help='name of the model to be used (e.g.: llama, gpt-40-mini')    
    parser.add_argument('--create_dataset', action='store_true', help='create csv dataset from the mutations.json')
    parser.add_argument('--launch_experiment', action='store_true', help='launch experiment for generating test cases to kill mutants') 
    
    argcomplete.autocomplete(parser)

    args = parser.parse_args()
    
    # Check if the provided path is a valid directory
    if not os.path.isdir(args.sut_path):
        print(f"The provided SUT path '{args.sut_path}' is not a valid directory.")
        return   
    # Check if the provided model is valid            
    if (args.model != "gpt-4o-mini" and args.model != "gpt-4o" and args.model != "llama"
            and not args.model.startswith("deepseek")):
        print(f"The selected model '{args.model}' is not valid.")
        return
    
    # get relevant paths
    results_path, executions_path, dataset_path, mutations_path, sut_test_dir_path = getWorkspacePaths(args.sut_path, args.model) 
    
    if args.create_dataset:
        create_dataset(mutations_path, dataset_path)
        
    elif args.launch_experiment:
        #Reset dataset before re-running the experiment
        print(f'Resetting mutant dataset: {dataset_path} \n')        
        create_dataset(mutations_path, dataset_path)    
            
        print(f'Running experiment with {args.model} to generate test cases for {mutantNbre} mutants\n')
        launchExperiment(args.model, args.sut_path, sut_test_dir_path, results_path, dataset_path, executions_path)
        copySuMoArtifactsToResults(args.sut_path, results_path)
        
if __name__ == '__main__':
    main()