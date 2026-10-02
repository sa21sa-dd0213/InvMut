//Generated Test by TG
//[[['PredictTheBlockHashChallenge', 'contract', 130, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender'], ['lockInGuess', 64, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'bytes32', 'hash'], ['settle', 129, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender']]]
import "forge-std/Test.sol";
import "../src/contract.sol";

contract fix_Test is Test {
	PredictTheBlockHashChallenge predicttheblockhashchallenge0;
	PredictTheBlockHashChallenge predicttheblockhashchallenge1;
	function setUp() public {
		predicttheblockhashchallenge0 = new PredictTheBlockHashChallenge();
		predicttheblockhashchallenge1 = new PredictTheBlockHashChallenge();
	}
	function test_fix_0() public {
		vm.prank(0x1E27000000000000000000000000000000000000);
		predicttheblockhashchallenge0.settle(); //settle__129("address(this).balance=1000000000000002437", 0, 7719)
	}
	function test_fix_1() public {
		vm.prank(0x2600000000000000000000000000000000000000);
		vm.deal(0x2600000000000000000000000000000000000000,  1000000000000000000 wei );
		predicttheblockhashchallenge1.lockInGuess{ value:  1000000000000000000 wei }( 0); //lockInGuess__64("address(this).balance=1000000000000000000", 1000000000000000000, 38, 0)
	}
}
