//Generated Test by TG
//[[['SimpleSuicide', 'contract', 44, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender'], ['sudicideAnyone', 43, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender']]]
import "forge-std/Test.sol";
import "../src/contract.sol";

contract fix_Test is Test {
	SimpleSuicide simplesuicide0;
	function setUp() public {
		simplesuicide0 = new SimpleSuicide();
	}
	function test_fix_0() public {
		vm.prank(0x656E9CaD6B68e917000000000000000000000000);
		simplesuicide0.sudicideAnyone(); //sudicideAnyone__43("address(this).balance=38", 0, 0)
	}
}
