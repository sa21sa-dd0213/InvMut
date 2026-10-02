# solidity_testgen

Test generation for Solidity in Foundry format  (https://github.com/foundry-rs/foundry)

Example of Contract under Test:
```
contract C {

    uint x;

	function f(uint _x) public {}
	function g(uint _x, uint _y) public {}
	function w(uint _x) public {}


	function i(uint _x) internal {}
}
```
Expected results of Test Generation:
```
import "forge-std/Test.sol";
import "../src/contract_under_test.sol";

contract contract_under_test_Test is Test {
	C c0, c1, c2, ... cN;

	function setUp() public {
		c0 = new C(); c1 = new C(); ... cN = new C();
	}
	function test_0() public {
		c0.f();
		c0.g();
		....
		c0.w();
	}
........
    function test_n() public {
		cN.g();
		cN.w();
		....
		cN.w();
	}
}
```



### Dependencies / Setup

* [Docker](https://docs.docker.com/engine/install/)

Also don't forget to get your user permission to interact with docker:
https://stackoverflow.com/questions/48957195/how-to-fix-docker-got-permission-denied-issue

* [Solidity Compiler](https://docs.soliditylang.org/en/latest/installing-solidity.html)

* [Foundry](https://book.getfoundry.sh/getting-started/installation)

* Python3 & pip

* GenHtml (part or lcov)

After dependencies are installed, you can install the package by calling:

```
sudo pip3 install solTg
```

After this, solTg can be used from any directory, calling the command:

```
solTg -i <input file/directory with .sol files>
```

Or you can run it locally, it is needed to install all the package requirements first, by calling
```
pip install -r requirements.txt
```

[//]: # (### Architecture)

[//]: # (![img_2.png]&#40;img_2.png&#41;)

[//]: # ()
[//]: # (### Building Tests as CHCs-paths-tree)

[//]: # (![img_4.png]&#40;img_4.png&#41;)



#### run test generation for specified sol-file with Python 
`solTg -i ./src/Loop_1.sol`

You can also give specific output dir:

`solTg -i folder_path -o ../testgen_output`

If project is to be run from the repo, call:

`python3 ./solTg/RunAll.py -i <some file/dir>`


Run forge project:

#### build project
`forge build`

#### run all tests
`forge test`

#### run specified test
`forge test --match Loop*`


[//]: # (#### Report example:)

[//]: # (![img_3.png]&#40;img_3.png&#41;)

#### Generate a report:
`python3 ./scripts/ReportBuilder.py -i testgen_dir`



### Local update:

To build package locally from the repository execute following command:
`python3 -m build`

To install it from the repository:
`python3 -m pip install --upgrade ./`

To upload it to pypi:
`python3 -m twine upload --repository pypi dist/*`