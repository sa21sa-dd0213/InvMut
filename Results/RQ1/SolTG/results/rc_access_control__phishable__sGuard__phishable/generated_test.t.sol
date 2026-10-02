//Generated Test by TG
//[[['Phishable', 'contract', 46, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'address', '_owner'], ['', 20, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender'], ['withdrawAll', 45, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'address', '_recipient']]]
import "forge-std/Test.sol";
import "../src/contract.sol";

contract fix_Test is Test {
	Phishable phishable0;
	Phishable phishable1;
	function setUp() public {
		phishable0 = new Phishable(0x0000000000000000000000000000000000000000);
		phishable1 = new Phishable(0x0000000000000000000000000000000000000000);
	}
	function test_fix_0() public {
		vm.prank(0x399B71D54Af9B293c00000000000000000000000);
		phishable0.withdrawAll(0x0000000000000000000000000000000000000000); //withdrawAll__45("address(this).balance=115792089237316195423570985008687907853269984665640564039457584007913129632216", 0, 0, 0)
	}
	function test_fix_1() public {
	}
}
