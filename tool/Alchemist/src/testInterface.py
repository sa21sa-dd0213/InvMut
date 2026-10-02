import json
import os
import shutil
import sys
import subprocess
import pandas as pd
import time
from utils import *
    
def run_sumo_pretest(test_file_path : str,  project_dir:str) -> str:
    """
    Run sumo pretest on a given test file.
    
    :param test_file_path: the absolute path to the test file to be run
    :project_dir: project folder
       
    :return: a message describing the outcome of the pretest: 
             True - If the pretest is successfull
             HardHat's error message -  if the pretest failed
    """
        
    package_manager = check_package_manager(project_dir)
    
    file_name = os.path.basename(test_file_path)
    dir_name = os.path.basename(os.path.dirname(test_file_path))
    relative_test_file_path = os.path.join(dir_name, file_name)
    print(f"### <Run SuMo>: {package_manager} sumo pretest {project_dir}/{relative_test_file_path}")

    # Public SuMo's `pretest` ignores the positional file arg and runs the whole
    # testDir. To validate ONLY the current generated test (faithful to Alchemist's
    # intent), isolate the testDir to just `test_file_path` for the run, then restore.
    test_dir = os.path.dirname(test_file_path)
    keep_name = os.path.basename(test_file_path)
    stash_dir = os.path.join(test_dir, "_alch_stash")
    os.makedirs(stash_dir, exist_ok=True)
    stashed = []
    for fname in os.listdir(test_dir):
        fpath = os.path.join(test_dir, fname)
        if fname == keep_name or fname == "_alch_stash":
            continue
        if os.path.isfile(fpath):
            dest = os.path.join(stash_dir, fname)
            shutil.move(fpath, dest)
            stashed.append((dest, fpath))

    try:
        result = subprocess.run([package_manager, 'sumo', 'pretest', relative_test_file_path],
                                stdout=subprocess.PIPE,
                                stderr=subprocess.PIPE,
                                text=True,
                                cwd=project_dir
                                )
        parsed_pretest_result = parse_sumo_pretest(result.stdout, result.stderr, project_dir)

        # Check if the script ran successfully
        if result.returncode == 0:
            print("### <SuMo>: pretest script executed successfully")
            #print("Output:\n", result.stdout)
            return parsed_pretest_result

        else:
            print("### <SuMo>: pretest script failed with errors")
            #print("### Pretest Error:\n", result.stderr)
            return parsed_pretest_result

    except Exception as e:
        print("### An error occurred:", str(e))
    finally:
        for dest, original in stashed:
            shutil.move(dest, original)
        try:
            os.rmdir(stash_dir)
        except OSError:
            pass


def run_sumo_drytest(mutant_id : str, test_file_path : str, project_dir:str) -> str:
    """
    Run sumo drytest on a given mutant and test file.
    
    :param mutant_id: the hash of the mutant to be tested
    :param test_file_path: the absolute path to the test file to be run
    :param project_dir: project folder
       
    :return: a message describing the outcome of the drytest: 
             live - If the mutant survived testing
             killed -  if the mutant was killed by the test
             Errror message -  if an error occurred             
    """
    
    package_manager = check_package_manager(project_dir)
    print("Run: ", package_manager, " sumo test ", mutant_id, mutant_id, test_file_path)

    # --- Public-SuMo adaptation (faithful to the original `testDry <id> <file>`) ---
    # The non-public SuMo Alchemist was written for had `testDry <mutantId> <testFile>`
    # which ran exactly ONE test file against ONE mutant. Public SuMo only exposes
    # `test [startHash] [endHash]`, which runs the WHOLE testDir. The single-mutant
    # range form `test <id> <id>` restricts to one mutant; to restore the one-test
    # semantics we isolate the testDir to contain only `test_file_path` for the run,
    # then restore every sibling afterwards.
    test_dir = os.path.dirname(test_file_path)
    keep_name = os.path.basename(test_file_path)
    stash_dir = os.path.join(test_dir, "_alch_stash")
    os.makedirs(stash_dir, exist_ok=True)
    stashed = []
    for fname in os.listdir(test_dir):
        fpath = os.path.join(test_dir, fname)
        if fname == keep_name or fname == "_alch_stash":
            continue
        if os.path.isfile(fpath):
            dest = os.path.join(stash_dir, fname)
            shutil.move(fpath, dest)
            stashed.append((dest, fpath))

    try:
        result = subprocess.run([package_manager, 'sumo', 'test', mutant_id, mutant_id],
                                stdout=subprocess.PIPE,
                                stderr=subprocess.PIPE,
                                text=True,
                                cwd=project_dir
                                )

        # Check if the script ran successfully
        if result.returncode == 0:
            print("Script executed successfully")
            print("Output:\n", result.stdout)
            return parse_sumo_drytest(result.stdout)

        else:
            print("Script failed with errors")
            print("Error:\n", result.stderr)
            return parse_sumo_drytest(result.stderr)

    except Exception as e:
        print("An error occurred:", str(e))
    finally:
        # Restore every stashed sibling test, then drop the stash dir.
        for dest, original in stashed:
            shutil.move(dest, original)
        try:
            os.rmdir(stash_dir)
        except OSError:
            pass
        
   
def parse_sumo_pretest(stdout : str, stderr: str, project_dir:str) -> str:    
    """
    Parse the stdout of sumo pretest.
    
    :param stdout: the stdout of sumo pretest
   
    :return: a message describing the outcome of the pretest: 
             True - If the pretest is successfull
             HardHat's error message -  if the pretest failed or an error occurred       
    """
    print("###  Parsing mocha report to extract test errors")
    
    mochatestFile = os.path.join(project_dir,'mochawesome-report','test-results.json')
    check_is_pretest_ok = is_string_in_message("Pre-test OK", stdout)
    check_zero_passing_tests =  is_string_in_message("0 passing", stdout)
    success = check_is_pretest_ok and not check_zero_passing_tests   
    
    failed_tests = []
   
    if success == False:
        print("#### Wait and read mochawesome")
        time.sleep(3)  # Wait for a couple of seconds before reading file

        if os.path.isfile(mochatestFile):
            print("#### mocha report exists")
            
            with open(mochatestFile, 'r') as file:
                    # Load the JSON data using json.load()
                    testing_report = json.load(file)
                    
            # Main logic to go through the report
            if not isinstance(testing_report["results"][0], bool):        
                for result in testing_report["results"]: 
                    # Handle any top-level hooks or tests directly within the result object
                    extract_errors_from_suite(result, failed_tests)
            else:
                print("#### The test file is empty.", testing_report)
                failed_tests.append("empty-test-file")
        else : 
            print("####  The mocha report was not created: Extracting error message from stderr.")
            # Extract specific error message
            error_lines = stderr.split('\n')

            for line in error_lines:
                if line.startswith("Error: "):
                    specific_error = line 
                    if specific_error == "Error: ":
                       specific_error = "Error: syntax error"                                            
                    if(not specific_error.startswith("Error: Pre-test failed")):                   
                        failed_tests.append(specific_error)                   
                        #print("#### Extracted error:", specific_error)

        try:
            shutil.rmtree(os.path.join(project_dir,'mochawesome-report'))
            print("#### The mocha report file has been removed successfully.")
        except FileNotFoundError:
            print("")
            
        if len(failed_tests) == 0 :
             failed_tests.append("Error: syntax error")
        print("#### Failed tests error info: ", failed_tests)    
        return failed_tests
    else:
        return "True"

def parse_sumo_drytest(stdout : str) -> str:
    """
    Parse the stdout of sumo drytest.
    
    :param stdout: the stdout of sumo drytest
   
    :return: a message describing the outcome of sumo drytest: 
             live - If the mutant survived testing
             killed -  if the mutant was killed by the test
             Errror message -  if an error occurred   
    """    
    
    # Check if the script ran successfully
    if is_string_in_message("survived testing", stdout):
        return("live")
    elif is_string_in_message("was killed by the tests", stdout):
        #There was an error
        return("killed")
    else:
        #There was an error
        return("Error: " + stdout)    

def is_string_in_message(msg : str, text : str) -> bool:
    """
    Checks if a message is contained in a given text.
    
    :param msg: the msg to look for
    :param text: the text to analyze        
    :return: true if the message is contained in the text, false otherwise
    """
    if text is None:
        return False
    
    text = text.replace('\r\n', '\n')
    
    if msg in text:
        return True
    else:
        return False
    
def check_package_manager(project_dir:str) -> str:
    """
    Checks whether the specified path is based on npm or Yarn by looking for package-lock.json or yarn.lock.

    Args:
    project_dir (str): The directory path to check.

    Returns:
    str: 'npx' if package-lock.json is found, 'yarn' if yarn.lock is found.
    """
    package_lock_path = os.path.join(project_dir, 'package-lock.json')
    yarn_lock_path = os.path.join(project_dir, 'yarn.lock')
    
    if os.path.isfile(package_lock_path):
        return 'npx'
    elif os.path.isfile(yarn_lock_path):
        return 'yarn'
    else:
        raise FileNotFoundError(f'Neither package-lock.json nor yarn.lock found in {project_dir}')


def extract_errors_from_suite(suite_or_result, failed_tests):
    # Check for "beforeHooks" and add failed hooks
    if "beforeHooks" in suite_or_result:
        for hook in suite_or_result["beforeHooks"]:
            print("##Found hook")            
            if hook["state"] == "failed":
                print("##Found failed hook", hook["title"])
                failed_tests.append({
                    "test title": hook["title"],
                    "error": hook["err"]["message"],
                })

    # Check for tests and add failed tests
    if "tests" in suite_or_result:
        for test in suite_or_result["tests"]:
            #print("##Found test")                        
            if test["state"] == "failed":
                print("### Failed test name: ", test["title"])     
                failed_tests.append({
                    "test title": test["title"],
                    "error": test["err"]["message"],
                })

    # If the suite has nested suites, recursively process them
    if "suites" in suite_or_result:
        for nested_suite in suite_or_result["suites"]:
            extract_errors_from_suite(nested_suite, failed_tests)