//Generated Test by TG
//[[['SimpleSuicide', 'contract', 32, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender'], ['sudicideAnyone', 31, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender']]]
import "forge-std/Test.sol";
import "../src/contract.sol";

contract fix_Test is Test {
	SimpleSuicide simplesuicide0;
	function setUp() public {
		simplesuicide0 = new SimpleSuicide();
	}
	function test_fix_0() public {
		vm.prank(0x46D1030f0361D480D00000000000000000000000);
		simplesuicide0.sudicideAnyone(); //sudicideAnyone__31("address(this).balance=38", 0, 0)
	}
}
