//Generated Test by TG
//[[['B', 'contract', 41, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender'], ['go', 36, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender'], ['', 40, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender']]]
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
		vm.prank(0x40759923EDe57D25100000000000000000000000);
		b1.go(); //go__36("address(this).balance=8856", 0, 0)
	}
}
