//Generated Test by TG
//[[['MyContract', 'contract', 54, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender'], ['sendTo', 53, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'address', 'receiver', 'uint', 'amount']]]
import "forge-std/Test.sol";
import "../src/contract.sol";

contract fix_Test is Test {
	MyContract mycontract0;
	function setUp() public {
		mycontract0 = new MyContract();
	}
	function test_fix_0() public {
		vm.prank(0x16BA4c5Af02aa2D4800000000000000000000000);
		mycontract0.sendTo(0x1e28000000000000000000000000000000000000, 1); //sendTo__53("address(this).balance=38", 0, 0, 7720, 1)
	}
}
