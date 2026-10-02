//Generated Test by TG
//[[['MyContract', 'contract', 42, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender'], ['sendTo', 41, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'address', 'receiver', 'uint', 'amount']]]
import "forge-std/Test.sol";
import "../src/contract.sol";

contract fix_Test is Test {
	MyContract mycontract0;
	function setUp() public {
		mycontract0 = new MyContract();
	}
	function test_fix_0() public {
		vm.prank(0x30eA68E10a8567e1a00000000000000000000000);
		mycontract0.sendTo(0x1E27000000000000000000000000000000000000, 0); //sendTo__41("address(this).balance=38", 0, 0, 7719, 0)
	}
}
