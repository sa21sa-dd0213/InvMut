import os
import requests
from utils import *
from dotenv import load_dotenv
import pandas as pd
import json as _json
import time as _time

# --- token/cache/cost usage logging (added for RQ3 stats; opt-in via ALCH_USAGE_LOG) ---
_USAGE_CTX = {"mutant_id": "", "phase": "", "attempt": 0}

def set_usage_ctx(mutant_id, phase, attempt):
    """Callers set the (mutant, phase, attempt) so the next LLM call is attributable."""
    _USAGE_CTX.update(mutant_id=str(mutant_id), phase=str(phase), attempt=int(attempt))

def _log_usage(model, response_json):
    """Append one JSONL record per LLM call: DeepSeek-reported token + cache split."""
    path = os.getenv("ALCH_USAGE_LOG")
    if not path:
        return
    u = (response_json or {}).get("usage", {}) or {}
    rec = {
        "t": _time.time(),
        "trial": os.getenv("ALCH_TRIAL", ""),
        "case": os.getenv("ALCH_CASE", ""),
        "mutant_id": _USAGE_CTX["mutant_id"],
        "phase": _USAGE_CTX["phase"],
        "attempt": _USAGE_CTX["attempt"],
        "model": model,
        "prompt_tokens": u.get("prompt_tokens"),
        "completion_tokens": u.get("completion_tokens"),
        "total_tokens": u.get("total_tokens"),
        "cache_hit_tokens": u.get("prompt_cache_hit_tokens"),
        "cache_miss_tokens": u.get("prompt_cache_miss_tokens"),
    }
    try:
        with open(path, "a") as fh:
            fh.write(_json.dumps(rec) + "\n")
    except Exception as e:
        print("## usage-log error:", e)

template_gen_hypothesis=os.path.join(os.getcwd(),"prompt_templates","gen_hypothesis.txt")
template_gen_new_hypothesis=os.path.join(os.getcwd(),"prompt_templates","gen_new_hypothesis.txt")
template_gen_experiment=os.path.join(os.getcwd(),"prompt_templates","gen_experiment.txt")
template_fix_test_for_mutant=os.path.join(os.getcwd(),"prompt_templates","fix_test_template.txt")

def promptGenerator(prompt_id, prompt_file_path, elements):
    """
    Generates a prompt based on the given prompt ID and elements by reading and formatting a template from a file.

    :prompt_id (str): The identifier for the type of prompt to generate.
    :prompt_file_path (str): The path to the file containing the prompt template.
    :elements (tuple): A tuple containing elements to be formatted into the prompt template.

    :returns: str: The generated prompt as a formatted string.

    Supported prompt IDs:
        - "gen_hypothesis": Generates a prompt for requesting a hypothesis for a mutant's survival.
        - "gen_new_hypothesis": Generates a prompt for requesting a new hypothesis for a mutant's survival.      
        - "gen_experiment": Generates a prompt for requesting a test for a mutant.
        - "fix_test": Generates a prompt for requesting a test fix based on error logs.
    """
    prompt_key_map = {
            "gen_hypothesis": ["contract_id", "contract_code", "mutant_id", "mutant_details", "mutant_diff"],
            "gen_new_hypothesis": ["contract_id", "mutant_id", "last_hypothesis"],
            "gen_experiment": ["contract_id", "mutant_id", "initial_test_setup"],
            "fix_test": ["contract_code", "test_code", "error_log"],
    }
        
    # Check if the prompt_id is valid
    if prompt_id not in prompt_key_map:
        raise ValueError(f"Unsupported prompt ID: {prompt_id}")

    # Create a dictionary for the format arguments based on the provided elements
    format_args = {key: value for key, value in zip(prompt_key_map[prompt_id], elements)}

    # Read the template file
    with open(prompt_file_path, 'r') as file:
        prompt_template = file.read()

    # Generate the formatted prompt
    prompt = prompt_template.format(**format_args)

    return prompt

def gen_hypothesis(model:str, mutant:dict, n_attempt: int, interactions_dir:str, messages:list, last_hypothesis:str) -> tuple[str, str,list]:
    """
   Generate hypothesis for a mutant's survival.
    :model (str): the model name       
    :mutant: mutant for which to generate the hypothesis
    :n_attempt: attempt number
    :interactions_dir: directory where to save the interactions with the model 
    :messages: the history of messages (includes rejected hypothesis)     
    
    :return: 
      - the hypothesis id
      - the response from the model (None if an error occurred)
      - the updated history of messages, including the model's response      
    """
    print(f"# [Prompt] - mutant {mutant['Mutant_id']} :  generating hypothesis - attempt {n_attempt}")  
    hypothesis_id = "hypothesis_"+mutant['Mutant_id']+"_"+str(n_attempt)
    interaction_file_name = f"gen_{hypothesis_id}"                 
        
    #First time generating hypothesis for the mutant
    if n_attempt == 1:
        prompt = promptGenerator("gen_hypothesis", template_gen_hypothesis,
                                [mutant['Contract_id'],
                                minify_code(mutant['Contract_Context']),
                                mutant["Mutant_id"],
                                mutant["Details"],
                                mutant["Diff"]
                                ])     
    else:
        prompt = promptGenerator("gen_new_hypothesis", template_gen_new_hypothesis,
                                [mutant['Contract_id'],
                                 mutant["Mutant_id"],
                                 last_hypothesis
                                ])             
    set_usage_ctx(mutant['Mutant_id'], "hypothesis", n_attempt)
    response, history, error = send_chat_completion(model, "user", prompt, 500, messages)
    minified_response = minify_code(response) if response is not None else ""

    #Add generated hypothesis to the history as an assistant message
    assistant_message = {"role": "assistant", "content": minified_response}
    history.append(assistant_message)
         
    if (response is None):
        saveInteraction(interactions_dir, interaction_file_name, prompt, error)
    else:
        saveInteraction(interactions_dir, interaction_file_name, prompt, response)
    return hypothesis_id, response, history  
               
def gen_experiment(model:str, mutant:dict, n_attempt:int, project_test_dir:str, generated_tests_dir:str, interactions_dir:str, messages:list) -> tuple[str,str,list]:    
    """
    Generate an experiment (test) for a mutant based on a hypothesis and save it to file
    :model (str): the model name         
    :mutant: mutant for which to generate the test    
    :n_attempt: test generation counter
    :project_test_dir: the test dir of the SUT     
    :generated_tests_dir: directory where to save the generated test cases        
    :interactions_dir: directory where to save the interactions with the model
    :messages: the history of previous messages, including the hypothesis and relevant contextual info
            
    :return: 
     - the path to the generated test code in the SUT (None if an error occurred)     
     - the generated test code (None if an error occurred)
     - the updated history of messages  
    """    
    print(f"## [Prompt] - mutant {mutant['Mutant_id']} :  generating experiment - attempt {n_attempt}")
    
    test_file_id = f"test_{mutant['Mutant_id']}_{n_attempt}.ts"     
    interaction_file_name = f"gen_{test_file_id}".split(".ts")[0]
        
    prompt = promptGenerator("gen_experiment", template_gen_experiment,
                             [mutant["Contract_id"], 
                              mutant["Mutant_id"],
                              mutant["Test_Context"]
                              ])
    set_usage_ctx(mutant['Mutant_id'], "experiment", n_attempt)
    response, history, error = send_chat_completion(model, "user", prompt, 3000, messages)

    if (response is None):
        test_file_sut_path = None
        test_file_code = None
        saveInteraction(interactions_dir, interaction_file_name, prompt, error)
    else: 
        test_file_sut_path=os.path.join(project_test_dir, test_file_id)   
        test_file_generated_path=os.path.join(generated_tests_dir, test_file_id)                            
        
        test_file_code = extractTestCode("typescript", response)
        if test_file_code is None:
            #Directly add error as assistant message  
            assistant_message = {"role": "assistant", "content": "Error"}
            history.append(assistant_message) 
            test_file_code = extractTestCode("error", response)        
            if test_file_code is None:
                test_file_code = ""   
        else:
            #Directly add generated test code as assistant message  
            minified_test_file_code = minify_code(test_file_code)                   
            assistant_message = {"role": "assistant", "content": minified_test_file_code}
            history.append(assistant_message) 
       
        #Save fixed test to SUT and generated_test_dir
        save_test_to_file(test_file_sut_path, test_file_code)
        save_test_to_file(test_file_generated_path, test_file_code)
        
        saveInteraction(interactions_dir, interaction_file_name, prompt, response)   
           
    return test_file_sut_path, test_file_code, history                                        


def fixTest(model:str, mutant:dict, dataset:pd.DataFrame, n_attempt:int, test_file_path:str, project_test_dir:str, generated_tests_dir:str, interactions_dir:str) -> tuple[str,str]:    
    """
    Fix a test case that is not correct -  (fails pretest)

    :mutant: mutant for which the test was generated
    :dataset: the mutant dataset from which to extract test errors    
    :n_attempt: test fix counter      
    :test_file_path: name (path) of the test case to be fixed
    :contract_code: original smart contract code
    :project_test_dir: the test dir of the SUT
    :generated_tests_dir: directory where to save the generated test cases    
    :interactions_dir: directory where to save the interactions with the model
   
    :return: 
     - the path to the generated test case (None if an error occurred)
     - the fixed test code (The empty string if an error occurred) 
    """      
    test_file_name = os.path.basename(test_file_path)     
    test_file_name_without_extension = os.path.splitext(test_file_name)[0]
    fixed_test_file_name = f"{test_file_name_without_extension}_{n_attempt}"                 
    
    print(f"\n## [Prompt] - mutant {mutant['Mutant_id']} :  fixing test - attempt {n_attempt}") 
    interaction_file_name = "fix_"+ fixed_test_file_name
    
    test_errors = dataset.loc[dataset['Mutant_id'] == mutant['Mutant_id'], 'Test_errors'].iloc[0]
    
    #Reset the history
    messages = init_history()
        
    #Error log is retrieved from the dataset        
    prompt = promptGenerator("fix_test", template_fix_test_for_mutant, [mutant["Contract_Context"],
                                                                        mutant["Generated_test"],
                                                                        test_errors])
    set_usage_ctx(mutant['Mutant_id'], "fix", n_attempt)
    response, history, error = send_chat_completion(model, "user", prompt, 3000, messages)
          
    if (response is None):
        test_file_sut_path=None
        test_file_code = None
        saveInteraction(interactions_dir, interaction_file_name, prompt, error)
    else:                   
        fixed_test_file_name = f"{fixed_test_file_name}.ts"          
        test_file_generated_path=os.path.join(generated_tests_dir, fixed_test_file_name)
        test_file_sut_path=os.path.join(project_test_dir, fixed_test_file_name)
        
        test_file_code = extractTestCode("typescript",response)
        if test_file_code is None:
            test_file_code=""
        
        #Save fixed test to SUT and generated_test_dir
        save_test_to_file(test_file_sut_path, test_file_code)
        save_test_to_file(test_file_generated_path, test_file_code)    
            
        saveInteraction(interactions_dir, interaction_file_name, prompt, response)   
    
    return test_file_sut_path, test_file_code  


def send_chat_completion(model:str, role:str, prompt:str, max_tokens:int, history: list)->tuple[str, list, str]:
    """_summary_
    Send a chat completion to a specific model

    Args:
        model (str): the model name    
        role (str): the message role
        prompt (str): the message prompt
        max_tokens(int): the max amount of tokens
        history (list): the history of messages

    Returns:
        str: the response to the prompt (or None if error)
        list: the updated history of messages
        str: the error message (or an empty string if none)        
    """  
    # Add the new message to the history
    new_message = {"role": role, "content": prompt}
    history.append(new_message) 
    
    load_dotenv()

    GPT_API_KEY = os.getenv("GPT_API_KEY")      
   
    if(model.startswith("gpt")):      
        url = "https://api.openai.com/v1/chat/completions"
        headers = {"Content-Type": "application/json", "Authorization" : f"Bearer {GPT_API_KEY}"}
        data = {
            "model": model,
            "messages": history,
            "max_tokens": max_tokens,
            "temperature": 0.1,
            "top_p": 0.9
        }
    elif(model.startswith("deepseek")):
        # DeepSeek is OpenAI-compatible. Configure via .env:
        #   DEEPSEEK_BASE_URL (default https://api.deepseek.com/v1/chat/completions)
        #   DEEPSEEK_API_KEY
        url = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com/v1/chat/completions")
        DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
        headers = {"Content-Type": "application/json", "Authorization" : f"Bearer {DEEPSEEK_API_KEY}"}
        data = {
            "model": model,
            "messages": history,
            "max_tokens": max_tokens,
            "temperature": 1.0,   # match InvMut's DeepSeek config
            "top_p": 0.9,
            # no-thinking per InvMut config (reasoning otherwise eats max_tokens and
            # truncates the generated test). `reasoning_effort:"none"` is rejected by the
            # API; the object form below is the working switch.
            "thinking": {"type": "disabled"},
        }
    elif(model.startswith("llama")):
        url = "insert-your-url-here"
        headers = {"Content-Type": "application/json", "Authorization" : "Bearer demo"}           
        data = {
            "model": "llama3.1:8b",
            "messages": history,
            "max_tokens": max_tokens,
            "temperature": 0.1,
            "top_p": 0.9
        }
    try:             
        response = requests.post(url, headers=headers, json=data)
        if response.status_code == 200:
                print("## <RESPONSE> OK (200)")
                response_json = response.json()
                _log_usage(model, response_json)
                # Extract the generated text from the response
                if 'choices' in response_json and len(response_json['choices']) > 0:
                    generated_text = response_json['choices'][0]['message']['content'] 
                    #print("Response", response_json)
                    return generated_text, history, ""
                else:
                    error_msg = "## <RESPONSE> ERROR: (No choices found in the response.)"
                    print(error_msg)                     
                    return None, history, error_msg
        else:
            print(f"## <RESPONSE> ERROR: {response.text}")                                 
            return None, history, response.text
    except Exception as e:
        print(f"## <RESPONSE> ERROR: An error occurred: {e}")
        return None, history, e  

  