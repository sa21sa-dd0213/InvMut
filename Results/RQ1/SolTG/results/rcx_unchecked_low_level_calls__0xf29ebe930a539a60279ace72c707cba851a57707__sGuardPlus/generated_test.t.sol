//Generated Test by TG
//[[['B', 'contract', 51, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender'], ['go', 46, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender'], ['', 50, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender']]]
import "forge-std/Test.sol";
import "../src/contract.sol";

contract fix_Test is Test {
	B b0;
	B b1;
	function setUp() public {
		b0 = new B();
		b1 = new B();
	}
	function test_fix_0() public {
	}
	function test_fix_1() public {
		vm.prank(0x1e0FFfda7809B496d00000000000000000000000);
		b1.go(); //go__46("address(this).balance=8856", 0, 0)
	}
}
