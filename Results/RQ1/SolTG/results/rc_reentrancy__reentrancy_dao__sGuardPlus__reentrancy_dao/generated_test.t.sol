//Generated Test by TG
//[[['ReentrancyDAO', 'contract', 98, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender'], ['withdrawAll', 80, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender'], ['deposit', 97, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender']]]
import "forge-std/Test.sol";
import "../src/contract.sol";

contract fix_Test is Test {
	ReentrancyDAO reentrancydao0;
	ReentrancyDAO reentrancydao1;
	function setUp() public {
		reentrancydao0 = new ReentrancyDAO();
		reentrancydao1 = new ReentrancyDAO();
	}
	function test_fix_0() public {
		vm.prank(0x1E27000000000000000000000000000000000000);
		reentrancydao0.deposit(); //deposit__97("address(this).balance=38", 0, 7719)
	}
	function test_fix_1() public {
		vm.prank(0x25E002f755c78eA4d00000000000000000000000);
		reentrancydao1.withdrawAll(); //withdrawAll__80("address(this).balance=38", 0, 0)
	}
}
