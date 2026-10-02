import argparse
import os
import random
import shutil
import subprocess
import time
from datetime import datetime
from sys import platform

from solTg.SolParser import SolParser
from solTg.TestWrapper import TestWrapper
import solTg.Utils as Utils

""" Init SetUp 
"""


def init():
    global ADT_DIR, SOLCMC, CORE, TIMEOUT, SANDBOX_DIR, SOLVER_TYPE, TG_PATH, TG_TIMEOUT, FORGE_PATH
    # Dockerfile-solcmc
    SANDBOX_DIR = "../sandbox"
    CORE = os.getcwd() + '/'
    SANDBOX_DIR = CORE + "/sandbox"
    if platform == "darwin":
        tmp = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname((os.path.dirname(os.path.realpath(__file__)))))))
        SOLCMC = tmp + "/deps/"
        TG_PATH = tmp + "/deps/tgnonlin"
        FORGE_PATH = "forge"
    if platform == "linux" or platform == "linux2":
        print("file:", __file__)
        tmp = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname((os.path.dirname(os.path.realpath(__file__)))))))
        SOLCMC = tmp + "/deps/"
        TG_PATH = tmp + "/deps/tgnonlin_linux"
        FORGE_PATH = "forge"
    TIMEOUT = 600
    SOLVER_TYPE = "z3"  # "eld" # "z3"


def clean_dir(dir):
    for root, dirs, files in os.walk(dir):
        for f in files:
            os.unlink(os.path.join(root, f))
        for d in dirs:
            shutil.rmtree(os.path.join(root, d))


def prepare_dir(dir):
    if not os.path.exists(dir):
        os.mkdir(dir)
    else:
        print('clear output directory {}'.format(dir))
        # remove dir
        os_info = os.uname()
        if (os_info.sysname != 'Darwin'):
            clean_dir(dir)
        else:
            shutil.rmtree(dir)
            os.mkdir(dir)


def logger(file, content):
    f = open(file, 'a')
    now = datetime.now()
    time = now.strftime("%H:%M:%S:%f")
    t = str('[{}]'.format(time))
    if type(content) is list:
        f.writelines([t] + ['\n'])
        for c in content:
            if type(c) is list:
                f.writelines([' '.join(c)] + ['\n'])
            elif type(c) is bytes:
                cs = str(c)
                list_to_print = [f + '\n' for f in cs.split('\\n')]
                f.writelines(list_to_print + ['\n'])
            else:
                f.writelines([str(c)] + ['\n'])
    elif type(content) is str:
        f.write(t + '\n' + content + '\n')
    f.close()


""" converts list ot string with spaces"""


def list_to_string(lst):
    return ' '.join([str(e) for e in lst])


def command_executer(command, timeout, log_file, output_file):
    print("command: {}".format(str(command)))
    f = open(output_file, "a")
    logger(log_file, list_to_string(command))
    with subprocess.Popen(command, stdout=f, stderr=subprocess.PIPE) as process:
        try:
            stdout, stderr = process.communicate(input, timeout=timeout)
        except subprocess.TimeoutExpired:
            process.kill()
            mesage = 'command: {} has been killed after timeout {}'.format(list_to_string(command), timeout)
            print(mesage)
            stdout, stderr = process.communicate()
        except Exception:
            process.kill()
            process.wait()
            mesage = 'command: {} has been killed after timeout {}'.format(list_to_string(command), timeout)
            print(mesage)
            logger(log_file, mesage)
            raise
        retcode = process.poll()
        logger(log_file, [process.args, retcode, stdout, stderr])
        if retcode and retcode != 254:
            return False
        else:
            return True


def command_executer_docker_solcmc(command, timeout, file):
    # os.chdir(SANDBOX_DIR)
    print("command: {}".format(str(command)))
    logger(file, list_to_string(command))
    print("File:", file)
    with subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE) as process:
        try:
            stdout, stderr = process.communicate(input, timeout=timeout)
        except subprocess.TimeoutExpired:
            process.kill()
            mesage = 'command: {} has been killed after timeout {}'.format(list_to_string(command), timeout)
            print(mesage)
            stdout, stderr = process.communicate()
            # logger(file, str(stdout))
            # logger(file, str(stderr))
        except Exception:
            process.kill()
            process.wait()
            mesage = 'command: {} has been killed after timeout {}'.format(list_to_string(command), timeout)
            print(mesage)
            logger(file, mesage)
            raise
        retcode = process.poll()
        logger(file, [process.args, retcode, stdout, stderr])
        if retcode and retcode != 254 and retcode != 137:
            return False
        else:
            # start with "Running with solver" and terminate with "Entire output"
            start = False
            out = []
            to_check = str(stdout).split("\\n")
            number_of_set_logic_HORN = 0
            for s in to_check:
                if "(set-logic HORN)" in str(s):
                    number_of_set_logic_HORN += 1
                if "Entire output" in str(s) or number_of_set_logic_HORN > 1:
                    break
                if start:
                    out.append(s + "\n")
                if "Running with solver" in str(s):
                    start = True
            return out


def run_solcmc(updated_file_name, contract_name):
    # ./docker_solcmc examples smoke_safe.sol Smoke 30 z3
    os.chdir(CORE)
    shutil.copy(SOLCMC + "run_solcmc", "./run_solcmc")
    shutil.copy(SOLCMC + "docker_solcmc_updated", "./docker_solcmc_updated")
    basename = os.path.basename(updated_file_name)
    smt_name = os.path.splitext(basename)[0] + '.smt2'
    print("Running solcmc")
    command = ["./docker_solcmc_updated", "tmp", basename,
                contract_name, str(10), SOLVER_TYPE]#, '>', smt_name]
    smt2_list = command_executer_docker_solcmc(command, TIMEOUT, CORE+"log.txt")
    print("Contract name:", basename)
    print("Output:", smt2_list)
    if not smt2_list:
        return "F"
    os.remove(CORE + "run_solcmc")
    os.remove(CORE + "docker_solcmc_updated")
    return smt2_list

def update_file(file, name):
    print("update file: {}".format(file))
    contract_name = name
    f = open(file, "r", encoding='ISO-8859-1')
    lines_to_check = f.readlines()
    addAssert = True
    functionRead = False
    out = []
    for tmp_l in lines_to_check: # ToDo: check if needed later when Excel feature will be ready
        if tmp_l.strip().startswith("//") :
            continue
        index_of_comments = tmp_l.find("//")
        if index_of_comments > 1:
            l = tmp_l[:index_of_comments] + "\n"
        else:
            l = tmp_l
        if "pragma solidity" in l:
            print("pragma solidity is found")
        else:
            out.append(l)
            if "function" in l:
                functionRead = True


    basename = os.path.basename(file)
    updated_file_name = os.path.dirname(file) + "/" + os.path.splitext(basename)[0] + \
                        "_updated" + os.path.splitext(basename)[1]
    f_updated = open(updated_file_name, 'a')
    # print("New out:", out)
    f_updated.writelines(out)
    f_updated.close()
    f.close()
    print(updated_file_name)
    print(contract_name)
    smt2_list = run_solcmc(updated_file_name, contract_name)
    # move to sanbox
    if smt2_list == "F":
        print("ERROR WAS ENCOUNTERED! IMPOSSBLE TO PRODUCE THE CHC ENCODING(POSSIBLY DUE TO THE LACK OF ASSERTS)!")
        return False
    source = CORE + "/tmp"
    for i in range(len(smt2_list)):
        smt2_list[i] = smt2_list[i].replace("\\r", "")
    # smt2_list = smt2_list.replace("", "\\r")
    # print("Source:", source)
    # print("SMT2 list:", smt2_list)
    destination = os.path.abspath(SANDBOX_DIR)
    allfiles = os.listdir(source)
    for e in allfiles:
        if e == "log.txt":
            shutil.move(source + "/" + e, destination + "/log_encoding.txt")
        else:
            shutil.move(source + "/" + e, destination + "/" + e)

    if smt2_list:
        print("Created smt2, will run adt transform")
        smt2_file = SANDBOX_DIR + "/" + os.path.splitext(basename)[0] + "_updated" + ".smt2"
        f_smt = open(smt2_file, 'a')
        f_smt.writelines(smt2_list)
        f_smt.close()
        clean_dir(CORE + "/tmp")
        os.rmdir(CORE + "/tmp")
        os.remove(CORE + "/log.txt")
    return True


def move_for_encoding(file, contract_name):
    print("move_for_encoding")
    # check tmp folder in SOLCMC/tmp
    tmp_dir = CORE + "/tmp"
    prepare_dir(tmp_dir)
    new_file = tmp_dir + "/" + os.path.basename(file)
    shutil.copyfile('tmp.sol', new_file)
    os.remove('tmp.sol')
    if update_file(new_file, contract_name):
        return True
    return False


def convert_for_tg(signature):
    out = []
    print("Signature:", signature)
    for c in signature:
        index = 0
        if 'contract' in c[0]:
            print("Contract: ", c)
            contract_name = c[0][0]
            contract_id = c[0][2]
            var_names = [e for i, e in enumerate(c[0][3:]) if i % 2 == 1]
            print("Vars: ", var_names)
            var_str = ','.join(var_names)
            out.append("contract_{}_{}:{}".format(contract_name, contract_id, var_str))
            index = 1
        for f in c[index:]:
            function_name = f[0]
            function_id = f[1]
            var_names = [e for i, e in enumerate(f[2:]) if i % 2 == 1]
            var_str = ','.join(var_names)
            out.append("{}__{}:{}".format(function_name, function_id, var_str))

    return '^'.join(out)


def run_tg(file, signature):
    global SANDBOX_DIR
    basename = os.path.basename(file)
    smt_name = os.path.splitext(basename)[0] + "_updated.smt2"
    new_smt_file_name = SANDBOX_DIR + "/" + smt_name
    print("run TG with".format(new_smt_file_name))
    logger(SANDBOX_DIR + '/log.txt', "run TG with".format(new_smt_file_name))
    signature_for_tg = convert_for_tg(signature)
    print("TG: ", signature_for_tg)
    command_tg = [TG_PATH, "--keys", signature_for_tg, new_smt_file_name]
    log_file = SANDBOX_DIR + "/log.txt"
    logger(log_file, ' '.join(command_tg))
    SANDBOX_DIR = os.path.abspath(SANDBOX_DIR)
    save = os.getcwd()
    os.chdir(SANDBOX_DIR)
    command_executer(command_tg, TG_TIMEOUT, log_file, log_file)
    os.chdir(save)


def run_test(file, signature):
    global  SANDBOX_DIR
    basename = os.path.basename(file)
    new_name = SANDBOX_DIR + "/" + basename
    print("Run tests for: {} ".format(new_name))
    save = os.getcwd()
    # get test from log
    # copy source file to "scr"
    local_path = os.getcwd()
    print(local_path + "/src/" + basename)
    # shutil.copyfile(file, local_path + "/src/" + basename)
    #run command:  forge test --match name
    SANDBOX_DIR = os.path.abspath(SANDBOX_DIR)
    logger(SANDBOX_DIR + "/log.txt", "new signature" + str(signature))
    #os.chdir("../")
    os.chdir(local_path)
    command_executer([FORGE_PATH, 'clean'], 60, SANDBOX_DIR + "/log.txt", SANDBOX_DIR + "/log.txt")
    command = [FORGE_PATH, 'test', '--match-contract', str(os.path.splitext(basename)[0])]
    command_executer(command, 60, SANDBOX_DIR + "/log.txt", SANDBOX_DIR + "/test_results.txt")
    command = [FORGE_PATH, 'coverage', '--match-contract', str(os.path.splitext(basename)[0]), '--report', 'lcov']
    command_executer(command, 60, SANDBOX_DIR + "/log.txt", SANDBOX_DIR + "/test_results.txt")
    command = [FORGE_PATH, 'coverage', '--match-contract', str(os.path.splitext(basename)[0]), '--report', 'summary']
    command_executer(command, 60, SANDBOX_DIR + "/log.txt", SANDBOX_DIR + "/test_results.txt")
    #copy lcov file
    if os.path.isfile("lcov.info"):
        shutil.move("lcov.info", SANDBOX_DIR + "/lcov.info")
        genhtml_report_command = ['genhtml', '--branch-coverage', '--output', '--ignore-errors category UNK', SANDBOX_DIR + '/generated-coverage', SANDBOX_DIR + "/lcov.info"]
        command_executer(genhtml_report_command, 60, SANDBOX_DIR + "/log.txt", SANDBOX_DIR + "/log.txt")
    os.chdir(save)
    shutil.copy(local_path + "/test/" + os.path.splitext(basename)[0] + ".t.sol",
                SANDBOX_DIR + "/" + os.path.splitext(basename)[0] + ".t.sol")


def find_contract_name(signature):
    for s in signature:
        print("SSig:", s)
        if s[0][1] == 'contract':
            return s[0][0]
    return 0



def main(filename, timeout, version):
    start_time = time.time()
    init()
    global ADT_DIR, SOLCMC, CORE, ADT_DIR, TIMEOUT, SOLVER_TYPE, SANDBOX_DIR, TG_PATH, TG_TIMEOUT, FORGE_PATH, VERSION
    TG_TIMEOUT = float(timeout)
    VERSION = version
    if not filename:
        parser = argparse.ArgumentParser(description='python script for Solidity Test Generation')
        insourse = ['-i', '--input_source']
        kwsourse = {'type': str, 'help': 'Input .c-file. or directory'}
        parser.add_argument(*insourse, **kwsourse)

        args = parser.parse_args()
        print(args)
        file = ""
        if args.input_source is not None:
            if os.path.isfile(args.input_source):
                file = args.input_source
                file = os.path.abspath(file)
                print('solidity input file was set to {}'.format(file))
            elif os.path.isdir(args.input_source):
                print('TBD'.format(args.input_source))
                exit(1)
        else:
            print('invalid input_source: {}'.format(args.input_source))
            exit(1)
    else:
        file = filename


    prepare_dir(SANDBOX_DIR)
    print("File: ", file)

    print("Pre sig")
    signature = SolParser.get_signature(file, VERSION)
    logger(SANDBOX_DIR + '/log.txt', str(signature))
    contract_name = find_contract_name(signature)
    if contract_name:
        print("In if")
        print("Initial sig: ", signature)
        # ToDo: run tg for each contract
        if not move_for_encoding(file, contract_name):
            return
        for s in signature:
            run_tg(file, [s])
        tw = TestWrapper(SANDBOX_DIR + "/testgen.txt", signature)
        clean_tests = tw.wrap()
        print(clean_tests)
        clean_tests_wo_duplicats = clean_tests
        if clean_tests:
            if True in [len(t) > 1 for t in clean_tests]:
                logger(SANDBOX_DIR + '/log.txt', "Multiple Calls Test")
        if clean_tests:
            logger(SANDBOX_DIR + '/log.txt', clean_tests)
            if type(clean_tests) is list:
                logger(SANDBOX_DIR + '/log.txt', "# TESTS: {}".format(len(clean_tests)))
            clean_tests_wo_duplicats = tw.remove_duplicates(clean_tests)
            file_name = os.path.basename(file)
            name_wo_extension = os.path.splitext(file_name)[0]
        else:
            logger(SANDBOX_DIR + '/log.txt', "# TESTS: NO TESTS")
        if(clean_tests_wo_duplicats):
            print("THERE ARE TESTS")
            # prepare_dir(CORE + "/test")
            tw.generate_sol_test(clean_tests_wo_duplicats, name_wo_extension, file)
            run_test(file, signature)
            # generate image
            Utils.generate_plot(SANDBOX_DIR + '/log.txt', SANDBOX_DIR + '/imag.png')

    tt = time.time() - start_time
    to_print_var = 'total time: {} seconds'.format(tt)
    print(to_print_var)
    logger(SANDBOX_DIR + '/log.txt', to_print_var)


if __name__ == "__main__":
    main("")
