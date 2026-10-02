import argparse
import time
from datetime import datetime
import os
import shutil
import subprocess
import solTg.SolidityTestGen as SolidityTestGen
from solTg.ReportBuilder import html_report
from solTg import __version__

""" Tools location
"""


def init():
    global SOURCE_PATH, SANDBOX_DIR, OUTPUTDIR
    # tmp = os.path.dirname(os.path.dirname((os.path.dirname(os.path.realpath(__file__)))))
    tmp = os.getcwd()
    SANDBOX_DIR = tmp + "/sandbox"
    OUTPUTDIR = tmp + "/report"


def clean_dir(dir):
    for root, dirs, files in os.walk(dir):
        for f in files:
            os.unlink(os.path.join(root, f))
        for d in dirs:
            shutil.rmtree(os.path.join(root, d))
    if not os.path.exists(dir):
        os.mkdir(dir)


def copy_dir(root_src_dir, root_dst_dir):
    for src_dir, dirs, files in os.walk(root_src_dir):
        dst_dir = src_dir.replace(root_src_dir, root_dst_dir, 1)
        if not os.path.exists(dst_dir):
            os.makedirs(dst_dir)
        for file_ in files:
            src_file = os.path.join(src_dir, file_)
            dst_file = os.path.join(dst_dir, file_)
            if os.path.exists(dst_file):
                os.remove(dst_file)
            shutil.copy(src_file, dst_dir)


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

def main_pipeline(files):
    global SOURCE_PATH, SANDBOX_DIR, OUTPUTDIR, RERUN, TIMEOUT, VERSION
    if RERUN:
        clean_dir(OUTPUTDIR)
    print("number of files: {}".format(len(files)))
    for i, f in enumerate(sorted(files)):
        start_time = time.time()
        print("{:.2f}".format(100 * i / len(files)), "%", f)
        print(i)
        ff = os.path.abspath(f)
        basename = os.path.basename(ff)
        dirname = os.path.dirname(ff)
        print("basename: {}".format(basename))
        print("dirname: {}".format(dirname))
        base_dirname = os.path.basename(dirname)
        dir_dirname = os.path.dirname(dirname)
        print("base_dirname: {}".format(base_dirname))
        print("dir_dirname: {}".format(dir_dirname))
        # Step 1: run SolidityTestGen.py -i f
        SolidityTestGen.main(f,  TIMEOUT, VERSION)
        # Step 2: mkdir: OUTPUTDIR + "/" + base_dirname
        new_sub_dir = OUTPUTDIR + "/" + base_dirname
        if not os.path.exists(new_sub_dir):
            os.mkdir(new_sub_dir)
        # Step 3. copy sanbox to new_dir_path
        new_dir_path = OUTPUTDIR + "/" + base_dirname + "/" + os.path.splitext(basename)[0]
        copy_dir(SANDBOX_DIR, new_dir_path)

        to_print_var = 'total time: {} seconds'.format(time.time() - start_time)
        #logger(os.path.dirname(f) + '/log.txt', to_print_var)


def main():
    start_time = time.time()
    init()
    global SOURCE_PATH, SANDBOX_DIR, TIMEOUT, OUTPUTDIR, RERUN, VERSION
    TIMEOUT = 120
    VERSION = '0.8.28'
    parser = argparse.ArgumentParser(description='python script to run Sol Test Generation for all files in dir')
    insourse = ['-i', '--input_source']
    kwsourse = {'type': str, 'help': 'Input .sol-file. or directory with .sol-files'}

    outdir = ['-o', '--output_dir']
    kwoutdir = {'type': str, 'help': 'Output direcory name. Default: OUTPUTDIR = ../testgen_output.'}

    timeout = ['-t', '--timeout']
    kwtimeout = {'type': str, 'help': 'Test generation timeout in seconds. Default: 120s.'}

    solidity = ['-s', '--solidity']
    kwsolidity= {'type': str, 'help': 'Solidity compiler version. Default: 0.8.28.'}

    version = ['-v', '--version']
    # kwversion = {'type': n, 'help': 'SolTG version'}

    parser.add_argument(*insourse, **kwsourse)
    parser.add_argument(*outdir, **kwoutdir)
    parser.add_argument(*timeout, **kwtimeout)
    parser.add_argument(*solidity, **kwsolidity)
    parser.add_argument(*version, action='store_true')
    kwcov = {'type': bool, 'help': 'true - rerun / false - continue. Default: true.'}
    parser.add_argument('--rerun', **kwcov)

    args = parser.parse_args()

    RERUN = True
    if args.rerun is not None:
        if args.rerun == 'false':
            RERUN = False
        if args.rerun == 'true' or args.rerun == 'True':
            RERUN = True

    files = []
    if args.version is not False:
        print('SolTG ' + str(__version__))
        exit(1)
    if args.input_source is not None:
        if os.path.isfile(args.input_source):
            file = args.input_source
            print('input file was set to {}'.format(file))
            files = [file]
        elif os.path.isdir(args.input_source):
            print('input directory was set to {}'.format(args.input_source))
            SOURCE_PATH = args.input_source
            files = sorted([os.path.join(dp, f) for dp, dn, filenames in os.walk(SOURCE_PATH)
                            for f in filenames if os.path.splitext(f)[1] == '.sol'
                            and os.path.splitext(f)[0] != "harness"])
            if not RERUN: # if rerun flase => find all finished files in testgen_output (-o: dir)
                destination = os.path.abspath(args.output_dir)
                subdirs = [f.path for f in os.scandir(destination) if f.is_dir() and os.path.basename(f)]
                al_run = []
                for sd in subdirs:
                    al_run += [f.path for f in os.scandir(sd) if f.is_dir() and os.path.basename(f)]
                al_run = [os.path.basename(a) + ".sol" for a in al_run]
                new_files = []
                for f in files:
                    if os.path.basename(f) not in al_run:
                        new_files.append(f)
                files = new_files # update all files and include only NOT fished file
        else:
            print('invalid input_source: {}'.format(args.input_source))
            exit(1)

    if args.output_dir is not None:
        print('sandoutput dir set to {}'.format(args.output_dir))
        OUTPUTDIR = args.output_dir

    if args.timeout is not None:
        TIMEOUT = args.timeout
        
    if args.solidity is not None:
        VERSION = args.solidity

    for f in files:
        print(f)
    main_pipeline(files)
    html_report.buildReport(OUTPUTDIR)
    html_report.build_excel_report(OUTPUTDIR)
    clean_dir(SANDBOX_DIR)
    os.rmdir(SANDBOX_DIR)
    # html_report.buildReport_Excel_klee(SANDBOX_DIR)
    tt = time.time() - start_time
    to_print_var = 'total time: {} seconds'.format(tt)
    print(to_print_var)


if __name__ == "__main__":
    main()