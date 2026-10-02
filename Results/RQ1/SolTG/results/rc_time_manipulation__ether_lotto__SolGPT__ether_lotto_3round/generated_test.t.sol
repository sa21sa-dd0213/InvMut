//Generated Test by TG
//[[['EtherLotto', 'contract', 85, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender'], ['play', 84, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender']]]
import "forge-std/Test.sol";
import "../src/contract.sol";

contract fix_Test is Test {
	EtherLotto etherlotto0;
	function setUp() public {
		etherlotto0 = new EtherLotto();
	}
	function test_fix_0() public {
		vm.prank(0x177bea1B13da3Dfcf00000000000000000000000);
		vm.deal(0x177bea1B13da3Dfcf00000000000000000000000,  10 wei );
		etherlotto0.play{ value:  10 wei }(); //play__84("address(this).balance=7719", 10, 0)
	}
}
