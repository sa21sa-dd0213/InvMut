//Generated Test by TG
//[[['Reentrance', 'contract', 130, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender'], ['getBalance', 71, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'address', 'u'], ['addToBalance', 91, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender'], ['withdrawBalance', 129, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender']]]
import "forge-std/Test.sol";
import "../src/contract.sol";

contract fix_Test is Test {
	Reentrance reentrance0;
	function setUp() public {
		reentrance0 = new Reentrance();
	}
	function test_fix_0() public {
		vm.prank(0xD4386e2a01626000000000000000000000000000);
		reentrance0.getBalance(0x0000000000000000000000000000000000000000); //getBalance__71("address(this).balance=38", 0, 0, 0)
	}
}
