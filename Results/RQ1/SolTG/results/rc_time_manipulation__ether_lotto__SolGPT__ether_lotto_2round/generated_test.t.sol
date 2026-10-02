//Generated Test by TG
//[[['EtherLotto', 'contract', 87, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender'], ['play', 86, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender']]]
import "forge-std/Test.sol";
import "../src/contract.sol";

contract fix_Test is Test {
	EtherLotto etherlotto0;
	function setUp() public {
		etherlotto0 = new EtherLotto();
	}
	function test_fix_0() public {
		vm.prank(0x9850000000000000000000000000000000000000);
		vm.deal(0x9850000000000000000000000000000000000000,  10 wei );
		etherlotto0.play{ value:  10 wei }(); //play__86("address(this).balance=7719", 10, 2437)
	}
}
