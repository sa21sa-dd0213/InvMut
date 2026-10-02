//Generated Test by TG
//[[['PredictTheBlockHashChallenge', 'contract', 131, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender'], ['lockInGuess', 64, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'bytes32', 'hash'], ['settle', 130, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender']]]
import "forge-std/Test.sol";
import "../src/contract.sol";

contract fix_Test is Test {
	PredictTheBlockHashChallenge predicttheblockhashchallenge0;
	PredictTheBlockHashChallenge predicttheblockhashchallenge1;
	PredictTheBlockHashChallenge predicttheblockhashchallenge2;
	function setUp() public {
		predicttheblockhashchallenge0 = new PredictTheBlockHashChallenge();
		predicttheblockhashchallenge1 = new PredictTheBlockHashChallenge();
		predicttheblockhashchallenge2 = new PredictTheBlockHashChallenge();
	}
	function test_fix_0() public {
		vm.prank(0x1E27000000000000000000000000000000000000);
		predicttheblockhashchallenge0.settle(); //settle__130("address(this).balance=1000000000000008855", 0, 7719)
	}
	function test_fix_1() public {
		vm.prank(0x52F6000000000000000000000000000000000000);
		predicttheblockhashchallenge1.settle(); //settle__130("address(this).balance=1000000000000011797", 0, 21238)
	}
	function test_fix_2() public {
		vm.prank(0x2600000000000000000000000000000000000000);
		vm.deal(0x2600000000000000000000000000000000000000,  1000000000000000000 wei );
		predicttheblockhashchallenge2.lockInGuess{ value:  1000000000000000000 wei }( 0); //lockInGuess__64("address(this).balance=1000000000000000000", 1000000000000000000, 38, 0)
	}
}
