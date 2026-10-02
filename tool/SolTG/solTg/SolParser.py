import argparse
import os
import shutil
import subprocess
import solcx
import re

def is_supported_type(identifier):
    not_supported = ['array', 'contract', 'enum', 'function_external', 'struct', 'userDefinedValue']
    return not True in [n in identifier for n in not_supported]


class SolParser:
    @classmethod
    def read(self, file, version):
        if os.path.splitext(file)[1] == ".sol":
            command = ['forge', 'flatten', '--output', 'tmp.sol', file]
            subprocess.run(command)
            file_exists = os.path.exists('tmp.sol')

            if not file_exists:
                shutil.copyfile(file, './tmp.sol')

            with open('tmp.sol', 'r') as f:
                lines = f.readlines()

            filtered_lines = [line for line in lines if
                              not line.replace(" ", "").startswith('*') and not line.replace(" ", "").startswith('/**') and not line.replace(" ", "").startswith('/*')]
            pragma = r"^pragma *solidity .*(\d+\.\d+\.\d+) *;$"
            strong_pragma = r"= *(\d+\.\d+\.\d+)"
            # version 
            # for line in filtered_lines:
            #     match = re.search(strong_pragma, line)
            #     if match:
            #         print("strong line:", line)
            #         version = match.group(1)
            #         break
            #     match = re.match(pragma, line.strip())
            #     if match:
            #         print("weak line:", line)
            #         version = match.group(1)
            #         break
            # if int(version.split('.')[1]) < 8:
            #     print("SOLIDITY VERSIONS BELOW 0.8 ARE NOT SUPPORTED!!")
            #     exit(1)
            solcx.install_solc(version)
            with open('tmp.sol', 'w') as f:
                f.writelines(filtered_lines)
            print("FILTERED: ", len(filtered_lines))
            print("NON FILTERED: ", len(lines))
            print(version)
            out = solcx.compile_files(
                ['tmp.sol'],
                # output_values=["abi", "ast", "bin-runtime"],
                solc_version=version
            )
            print("OUT: ", list(out.keys()))
            print(list(out.keys())[len(list(out.keys())) - 1])
            out_results = out[list(out.keys())[len(list(out.keys())) - 1]]
            print("OUT:", out_results.keys())
            return out_results['ast']

    @classmethod
    def parse_data(self, data):

        contracts = 'nodes'
            # lambda data: 'nodes' if 'nodes' in data['nodes'] else 'children'
        # 'nodeType' = 'name'
        print(contracts)
        n_of_contracts = len(data[contracts])
        print("number of nodes: {}".format(n_of_contracts))
        out = []
        for n in data[contracts]:
            if n['nodeType'] != "ContractDefinition":
                continue
            print("Contract: ", n)
            for_one_contract = []
            name = n['name']
            contract_id = n['id']
            print("name: {} id: {}".format(name, contract_id))
            contractKind = n['contractKind']
            if 'abstract' in n:
                print("Abstract:", n['abstract'])
            if contractKind != "contract" or ('abstract' in n and n['abstract'] == 'True'):
                print("Parsing stopped")
                continue
            print("contractKind: {}".format(contractKind))
            p_type1 = 'state_type'
            p_name1 = 'state'
            p_type2 = 'uint'
            p_name2 = 'msg.value'
            p_type3 = 'address'
            p_name3 = 'msg.sender'
            for_one_contract.append([name, contractKind, contract_id, p_type1, p_name1, p_type2, p_name2, p_type3, p_name3])
            print(for_one_contract)
            f_c = n['nodes']
            # print("Node: ", f_c)
            for fc in f_c:
                # print("Func: ", fc)
                f_type = fc['nodeType']
                if f_type != 'FunctionDefinition':
                    continue
                f_kind = ''
                if 'kind' in fc:
                    f_kind = fc['kind']
                else:
                    if fc['isConstructor']:
                        f_kind = 'constructor'
                    else:
                        f_kind = 'function'
                f_id = fc['id']
                f_name = fc['name']
                f_mutability = fc['stateMutability']
                print("Name:", f_name)
                print("Type:", f_type)
                print("Kind:", f_kind)
                print("Id:", f_id)
                print("Mutability:", f_mutability)
                if f_kind == 'constructor':
                    print(f_name)
                    print("Constructor: ", fc)
                    parameters = fc['parameters']['parameters']
                    constructor_parameters = []
                    for p in parameters:
                        identifier = p["typeDescriptions"]["typeIdentifier"]
                        if is_supported_type(identifier):
                            constructor_parameters.append(p['typeName']['name'])
                            constructor_parameters.append(p['name'])
                    print("Constructor parameters: ", constructor_parameters)
                    # find [name, contractKind] and add constructor_parameters
                    print("For one con before: ", for_one_contract)
                    for el in for_one_contract:
                        if el[0] == name and el[1] == 'contract':
                            el += constructor_parameters
                    print("For one con after: ", for_one_contract)
                    continue
                elif (f_kind == 'function' or f_kind == 'fallback' or f_kind == 'receive') and (
                        fc['visibility'] == 'public' or fc['visibility'] == 'external'):
                    tmp_f = [f_name, f_id]
                    print("FUNCTION:")
                    print("kind: {} name: {} id: {}".format(f_kind, f_name, f_id))
                    params = fc['parameters']['parameters']
                    print("# of parameters: {}".format(len(params)))
                    # if f_mutability == 'payable':
                    #     identifier = 'msg'
                    #     p_type = 'tx_type'
                    #     p_name = 'tx'
                    #     tmp_f.append(p_type)
                    #     tmp_f.append(p_name)
                    p_type = 'state_type'
                    p_name = 'state'
                    tmp_f.append(p_type)
                    tmp_f.append(p_name)
                    p_type = 'uint'
                    p_name = 'msg.value'
                    tmp_f.append(p_type)
                    tmp_f.append(p_name)
                    p_type = 'address'
                    p_name = 'msg.sender'
                    tmp_f.append(p_type)
                    tmp_f.append(p_name)
                    # p_type = 'uint'
                    # p_name = 'balanceOf'
                    # tmp_f.append(p_type)
                    # tmp_f.append(p_name)
                    for p in params:
                        identifier = p["typeDescriptions"]["typeIdentifier"]
                        if is_supported_type(identifier):
                            p_type = p['typeName']['name']
                            p_name = p['name']
                            tmp_f.append(p_type)
                            tmp_f.append(p_name)
                        elif 'contract' in identifier:
                            tmp = p['typeDescriptions']['typeString']
                            if 'contract' in tmp:
                                p_type = tmp.split()[1]
                                p_name = p['name']
                            else:
                                continue  # unkown ow type
                        elif not is_supported_type(identifier):
                            tmp_f = []  # enum case or function_external or struct : skip
                        else:
                            if 'name' in p['typeName']['baseType']:
                                p_type = p['typeName']['baseType']['name']
                                p_name = p['name']
                                tmp_f.append(p_type + "[]")
                                tmp_f.append(p_name)
                            else:
                                tmp_f = []  # case of array[][] not supported currently
                                continue
                        # print("type: {}".format(p_type))
                        # print("name: {}".format(p_name))
                    if tmp_f:
                        for_one_contract.append(tmp_f)
                elif f_kind == 'function' and (fc['visibility'] == 'private' or fc['visibility'] == 'internal'):
                    continue
                else:
                    print("SOMETHING WEIRD")
                    print(f_kind)
                    print(fc['visibility'])
                    exit(1)
            if len(for_one_contract) > 1:
                out.append(for_one_contract)
        # exit(1)
        return out

    @classmethod
    def get_signature(self, file, version):
        d = SolParser.read(file, version)
        if d:
            return SolParser.parse_data(d)
        else:
            return []


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='python script for sol file parse')
    insourse = ['-i', '--input_file']
    kwsourse = {'type': str, 'help': 'path: location of the file'}
    parser.add_argument(*insourse, **kwsourse)
    args = parser.parse_args()

    if args.input_file is not None and os.path.isfile(args.input_file):
        f = args.input_file
        print('input file {}'.format(f))
    else:
        exit(1)

    d = SolParser.read(f,'0.8.28')
    if d:
        print(SolParser.parse_data(d))
