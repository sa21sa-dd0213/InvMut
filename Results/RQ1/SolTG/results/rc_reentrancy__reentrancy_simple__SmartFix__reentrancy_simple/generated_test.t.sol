//Generated Test by TG
//[[['Reentrance', 'contract', 87, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender'], ['getBalance', 17, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'address', 'u'], ['addToBalance', 46, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender'], ['withdrawBalance', 86, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender']]]
import "forge-std/Test.sol";
import "../src/contract.sol";

contract fix_Test is Test {
	Reentrance reentrance0;
	Reentrance reentrance1;
	function setUp() public {
		reentrance0 = new Reentrance();
		reentrance1 = new Reentrance();
	}
	function test_fix_0() public {
		vm.prank(0x1E27000000000000000000000000000000000000);
		reentrance0.addToBalance(); //addToBalance__46("address(this).balance=38", 0, 7719)
	}
	function test_fix_1() public {
		vm.prank(0x13A8dd6BB0224429C00000000000000000000000);
		reentrance1.getBalance(0x0000000000000000000000000000000000000000); //getBalance__17("address(this).balance=38", 0, 0, 0)
	}
}
