//Generated Test by TG
//[[['Reentrancy_bonus', 'contract', 99, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender'], ['withdrawReward', 69, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'address', 'recipient'], ['getFirstWithdrawalBonus', 98, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'address', 'recipient']]]
import "forge-std/Test.sol";
import "../src/contract.sol";

contract fix_Test is Test {
	Reentrancy_bonus reentrancy_bonus0;
	Reentrancy_bonus reentrancy_bonus1;
	function setUp() public {
		reentrancy_bonus0 = new Reentrancy_bonus();
		reentrancy_bonus1 = new Reentrancy_bonus();
	}
	function test_fix_0() public {
		vm.prank(0x2b3708767f977E95500000000000000000000000);
		reentrancy_bonus0.getFirstWithdrawalBonus(0x1E27000000000000000000000000000000000000); //getFirstWithdrawalBonus__98("address(this).balance=38", 0, 0, 7719)
	}
	function test_fix_1() public {
		vm.prank(0x38Ceb98531F22392200000000000000000000000);
		reentrancy_bonus1.withdrawReward(0x0000000000000000000000000000000000000000); //withdrawReward__69("address(this).balance=38", 0, 0, 0)
	}
}
