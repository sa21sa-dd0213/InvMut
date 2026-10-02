//Generated Test by TG
//[[['Phishable', 'contract', 48, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'address', '_owner'], ['', 22, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender'], ['withdrawAll', 47, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'address', '_recipient']]]
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
		vm.prank(0x29b85Ba9a0248E79F00000000000000000000000);
		phishable0.withdrawAll(0x0000000000000000000000000000000000000000); //withdrawAll__47("address(this).balance=7720", 0, 0, 0)
	}
	function test_fix_1() public {
	}
}
