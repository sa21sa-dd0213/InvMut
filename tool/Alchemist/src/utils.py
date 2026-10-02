import os
import re
import shutil
          
def saveInteraction(interactions_dir: str, fileName:str, prompt:str, response:str):  
    """
    Save a request and response to file
    :interactions_dir: path to the folder where to save the interaction
    :fileName: name of the file to be saved
    :prompt: prompt used for the request
    :response: response from the model 
    """     
    
    prompt_file_path = os.path.join(interactions_dir, f"interaction_{fileName}.txt")
        
    with open(prompt_file_path, 'w') as file:
            file.write(prompt +"\n\n"+ response)
            print("## <RESPONSE> written to ", prompt_file_path + "\n")
            

def extractTestCode(markerType:str, text: str) -> str:
    """
    Extracts test code from the model's response.
    
    :text: the model's response.
    :return: the extracted test code (or None)
    """
    if markerType == "typescript":
        start_marker = "```typescript"
        end_marker = "```"
    elif markerType == "error":
        start_marker = "```\n```"
        end_marker = "```\n```"    
    start_index = text.find(start_marker)
    
    # If the start marker is not found, return a warning
    if start_index == -1:
        print("### WARNING - Test code not found.")
        return None
    
    # Initialize end_index to handle multiple end markers
    end_index = start_index
    while True:
        end_index = text.find(end_marker, end_index + 1)
        if end_index == -1:
            print("### WARNING - End marker not found.")
            return None
        # Check if the segment between start_index and end_index contains the start_marker
        if text.find(start_marker, start_index + len(start_marker), end_index) == -1:
            break
    
    js_code = text[start_index + len(start_marker):end_index].strip()
    
    return js_code

def save_testfile_in_SUT(mutant_id: str, test_folder:str, test_file_code:str, testgen_attempt_n: int, pretest_attempt_n: int) -> str:  
    """
    Run sumo drytest on a given test file and mutant. 
    If the mutant survives, generate a new hypothesis and experiment (until max attempts is reached). 
    
    :param mutant_id: the hash of the mutant to be tested    
    :param test_folder: the folder where the test file is saved 
    :param test_file_code: the test file code
    :param testgen_attempt_n: the attempt number for the generation of this test file
    :param pretest_attempt_n: the attempt number for the pretest of this test file    
       
    :return: the full path of the saved test file (e.g.: test/test-mc230c9f0.ts)     
    """
    
    test_file_name = "test-"+mutant_id+".ts"
    test_file_path = os.path.join(test_folder, test_file_name)     
    
    #Rename previous test so it's not overwritten   
    if testgen_attempt_n != 0 or pretest_attempt_n != 0:
        rename_saved_testfile(test_file_path, testgen_attempt_n, pretest_attempt_n)
        
    # Parse and save the generated test code into the SUT's test folder          
    save_file(test_file_path, test_file_code)
    return test_file_path    

def save_test_to_file(path:str, content:str):
    """
    Saves a test file to a specified path.    
    :param path: the path where the file should be saved   
    :param content: the file content   
         
    :return: the full path of the saved file (e.g.: test/test-mc230c9f0.ts)
    """
    try:
        with open(path, 'w') as file:
            file.write(content)
        print(f"## Test file saved to {path}\n")         
    except IOError as e:
        print(f"Error saving test file: {e}")        
    return path

def copy_file(source_path, destination_path, new_name=None):
    """
    Copies a file from source_path to destination_path. 
    Optionally, renames the file to new_name.
    
    Args:
    source_path (str): The path to the file you want to copy.
    destination_path (str): The path where you want to copy the file.
    new_name (str, optional): The new name for the copied file (with extension). 
                              If not provided, the original name is used.
    
    Returns:
    str: Full path of the newly copied file.
    """
    # Check if the source file exists
    if not os.path.isfile(source_path):
        raise FileNotFoundError(f"The source file {source_path} does not exist.")

    # Make sure the destination path exists, if not, create it
    if not os.path.exists(destination_path):
        os.makedirs(destination_path)

    # Use original file name if new_name is not provided
    if new_name is None:
        new_name = os.path.basename(source_path)  # Get the original file name

    # Define the new full path with the name
    new_file_path = os.path.join(destination_path, new_name)

    # Copy the file to the destination (preserving metadata)
    shutil.copy2(source_path, new_file_path)
    
    return new_file_path


def save_file(path: str, content : str) -> str:
    """
    Saves the content to a specified path.    
    :param path: the path where the file should be saved   
    :param content: the file content   
         
    :return: the full path of the saved file (e.g.: test/test-mc230c9f0.ts)
    """
    
    try:
        with open(path, 'w') as file:
            file.write(content)
        print(f"Test case saved successfully to {path}")
    except IOError as e:
        print(f"Error saving test case: {e}")        
    return path
       
def rename_saved_testfile(test_file_path: str, testgen_attempt: int, pretest_attempt: int):
    """
    Renames an existing test file based on the attempt number and phase.
    
    :param test_file_path: the path of the test file to be renamed
    :param testgen_attempt: the test generation attempt number for this test file
    :param pretest_attempt: the pretest attempt number for this test file  
         
    :return: the full path of the saved test file (e.g.: test/test-mc230c9f0-1-0.ts)
    """
    try:
        # Split the file path into base and extension
        fileName, fileExtension = os.path.splitext(test_file_path)
        
        # Construct new file name
        new_file_name = f"{fileName}-{testgen_attempt}-{pretest_attempt}{fileExtension}"
        
        # Rename the file
        os.rename(test_file_path, new_file_name)
        
        print(f"Test case renamed successfully to {new_file_name}")
        
        return new_file_name
        
    except OSError as e:
        print(f"Error renaming test case: {e}")
        return None   
    
def delete_generated_tests_from_SUT(folder_path: str):
    """
    Deletes all files in the given folder that start with 'test_m'.
    
    :param folder_path: The path to the folder where files will be deleted.
    """
    # Ensure the folder exists
    if not os.path.exists(folder_path):
        print(f"The folder '{folder_path}' does not exist.")
        return
    
    # Iterate over the files in the folder
    for filename in os.listdir(folder_path):
        # Check if the file starts with 'test_m'
        if filename.startswith("test_m"):
            file_path = os.path.join(folder_path, filename)
            # Ensure it's a file and then delete it
            if os.path.isfile(file_path):
                try:
                    os.remove(file_path)
                    print(f"Deleted file: {file_path}")
                except Exception as e:
                    print(f"Error deleting file {file_path}: {e}")
            else:
                print(f"Skipping non-file: {file_path}")

def extract_from_marker(start_marker: str, text: str) -> str:
    """
    Given some text, extract a string starting from a start marker (inclusive) to the end of the text.
    
    :param start_marker: the start marker
    :param text: the text from which to extract the string        
    :return: the string starting from the start marker to the end of the text
    """
    
    if text is None:   
        return ""
    
    # Normalize line endings
    text = text.replace('\r\n', '\n')
    
    # Find the index of the start marker
    start_pos = text.find(start_marker)
    if start_pos == -1:
        return ""  # Start marker not found
    
    # Include the start marker and up to the end of the string
    extracted_text = text[start_pos:].strip()
    return extracted_text

      
def extract_between_markers(start_marker: str, end_marker: str, text: str) -> str:
    """
    Given some text, extract a string between a start and end marker (markers excluded).
    
    :param start_marker: the start marker
    :param end_marker: the end marker
    :param text: the text from which to extract the string        
    :return: the string between the specified markers
    """
    
    if text is None:   
        return ""

    # Normalize line endings
    text = text.replace('\r\n', '\n')
    
    # Find the index of the start and end markers
    start_pos = text.find(start_marker)
    if start_pos == -1:
        return ""  # Start marker not found

    end_pos = text.find(end_marker, start_pos + len(start_marker))
    if end_pos == -1:
        return ""  # End marker not found

    # Include the start marker but exclude the end marker
    extracted_text = text[start_pos + len(start_marker):end_pos].strip()
    return extracted_text


def find_and_read_contract(folder_path, contract_name):
    # Search for the file in the folder and its subfolders
    for root, dirs, files in os.walk(folder_path):
        for file in files:
            if file == contract_name:
                file_path = os.path.join(root, file)
                # Read the file
                with open(file_path, 'r', encoding='utf-8') as f:
                    return f.read()
    return None

def remove_comments(code):
    lines = code.splitlines()

    filtered_lines = [line for line in lines if not line.strip().startswith("//")]
    code = ' '.join(filtered_lines)
    return code

def search_by_id(data, search_id):
    for _, mutations in data.items():
        for mutation in mutations:
            if mutation['id'] == search_id:
                return mutation['operator']
    return None

def minify_code(source_code: str) -> str:
    
    # Remove multi-line comments (/* comment */ and /** comment */)
    source_code = re.sub(r'/\*.*?\*/', '', source_code, flags=re.DOTALL)

    # Remove single-line comments (// comment), ensuring that we only remove the comment part
    #source_code = re.sub(r'^\s*//.*$', '', source_code, flags=re.MULTILINE)
    
    # Split the source code into lines
    lines = source_code.splitlines()
    
    # Strip whitespace from each line and remove empty lines
    stripped_lines = [line.strip() for line in lines if line.strip()]
    
    # Join the stripped lines with a single space to minify the code
    minified_code = ' '.join(stripped_lines)
    
    return minified_code

  
# Utility function to init/reset the chat history to the system message
def init_history():
    """
    clear the existing chat history
    """
    history = [{"role": "system", "content": "You are a Solidity smart contract auditor and tester."}]
    
    return history

# Utility function to trim the chat history to the last n messages
def trim_history_last(history: list, n: int) -> list:
    """_summary_
    Returns the last n elements of the history.
    If the history contains fewer than n messages, it returns the entire history.
    Args:
        history (list): the history of messsges
        n (int): the last n messages to be returned

    Returns:
        list: the trimmed history
    """
    return history[-n:] if len(history) > n else history

def trim_history_first(history: list, n: int) -> list:
    """
    Returns the first n elements of the history.
    If the history contains fewer than n messages, it returns the entire history.
    
    Args:
        history (list): the history of messages
        n (int): the first n messages to be returned

    Returns:
        list: the trimmed history
    """
    return history[:n] if len(history) > n else history
