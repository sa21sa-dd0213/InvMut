//Generated Test by TG
//[[['DepositLog', 'contract', 462, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender'], ['approvedToLog', 125, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'address', '_caller'], ['setApprovedLogger', 145, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'address', '_logger', 'bool', '_status'], ['logCreated', 171, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'address', '_keepAddress'], ['logRedemptionRequested', 210, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'address', '_requester', 'bytes32', '_digest', 'uint256', '_utxoSize', 'bytes', '_redeemerOutputScript', 'uint256', '_requestedFee', 'bytes', '_outpoint'], ['logGotRedemptionSignature', 242, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'bytes32', '_digest', 'bytes32', '_r', 'bytes32', '_s'], ['logRegisteredPubkey', 271, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'bytes32', '_signingGroupPubkeyX', 'bytes32', '_signingGroupPubkeyY'], ['logSetupFailed', 294, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender'], ['logFraudDuringSetup', 317, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender'], ['logFunded', 340, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender'], ['logCourtesyCalled', 363, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender'], ['logStartedLiquidation', 389, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'bool', '_wasFraud'], ['logRedeemed', 415, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'bytes32', '_txid'], ['logLiquidated', 438, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender'], ['logExitedCourtesyCall', 461, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender']]]
import "forge-std/Test.sol";
import "../src/contract.sol";

contract fix_Test is Test {
	DepositLog depositlog0;
	DepositLog depositlog1;
	DepositLog depositlog2;
	DepositLog depositlog3;
	DepositLog depositlog4;
	DepositLog depositlog5;
	DepositLog depositlog6;
	DepositLog depositlog7;
	DepositLog depositlog8;
	DepositLog depositlog9;
	DepositLog depositlog10;
	DepositLog depositlog11;
	DepositLog depositlog12;
	DepositLog depositlog13;
	function setUp() public {
		depositlog0 = new DepositLog();
		depositlog1 = new DepositLog();
		depositlog2 = new DepositLog();
		depositlog3 = new DepositLog();
		depositlog4 = new DepositLog();
		depositlog5 = new DepositLog();
		depositlog6 = new DepositLog();
		depositlog7 = new DepositLog();
		depositlog8 = new DepositLog();
		depositlog9 = new DepositLog();
		depositlog10 = new DepositLog();
		depositlog11 = new DepositLog();
		depositlog12 = new DepositLog();
		depositlog13 = new DepositLog();
	}
	function test_fix_0() public {
		vm.prank(0x2B56A570129D2fb7500000000000000000000000);
		depositlog0.logExitedCourtesyCall(); //logExitedCourtesyCall__461("address(this).balance=38", 0, 0)
	}
	function test_fix_1() public {
		vm.prank(0x1ec2695d255edf65E00000000000000000000000);
		depositlog1.logLiquidated(); //logLiquidated__438("address(this).balance=38", 0, 0)
	}
	function test_fix_2() public {
		vm.prank(0x485CF2be216b8cBBD00000000000000000000000);
		depositlog2.logRedeemed( 0); //logRedeemed__415("address(this).balance=38", 0, 0, 0)
	}
	function test_fix_3() public {
		vm.prank(0x4A084fc7fDa46174F00000000000000000000000);
		depositlog3.logStartedLiquidation( false); //logStartedLiquidation__389("address(this).balance=38", 0, 0, false)
	}
	function test_fix_4() public {
		vm.prank(0xaa75dBb324BBbb8C000000000000000000000000);
		depositlog4.logCourtesyCalled(); //logCourtesyCalled__363("address(this).balance=38", 0, 0)
	}
	function test_fix_5() public {
		vm.prank(0x21f91ED313a231F4100000000000000000000000);
		depositlog5.logFunded(); //logFunded__340("address(this).balance=38", 0, 0)
	}
	function test_fix_6() public {
		vm.prank(0x8C2AFc7eF2DD97a0000000000000000000000000);
		depositlog6.logFraudDuringSetup(); //logFraudDuringSetup__317("address(this).balance=38", 0, 0)
	}
	function test_fix_7() public {
		vm.prank(0x355E857382358846000000000000000000000000);
		depositlog7.logSetupFailed(); //logSetupFailed__294("address(this).balance=38", 0, 0)
	}
	function test_fix_8() public {
		vm.prank(0x18915fD4544A0bc9800000000000000000000000);
		depositlog8.logRegisteredPubkey( 0, 0); //logRegisteredPubkey__271("address(this).balance=38", 0, 0, 0, 0)
	}
	function test_fix_9() public {
		vm.prank(0x78cCeD51CC2f4F0e000000000000000000000000);
		depositlog9.logGotRedemptionSignature( 0, 0, 0); //logGotRedemptionSignature__242("address(this).balance=38", 0, 0, 0, 0, 0)
	}
	function test_fix_10() public {
		vm.prank(0x3Ee7aeE044bAABFaF00000000000000000000000);
		depositlog10.logRedemptionRequested(0x0000000000000000000000000000000000000000, 0, 0, ((bytes_tuple_accessor_length _tg_136)=0), 0, ((bytes_tuple_accessor_length _tg_138)=0)); //logRedemptionRequested__210("address(this).balance=38", 0, 0, 0, 0, 0, ((bytes_tuple_accessor_length _tg_136)=0), 0, ((bytes_tuple_accessor_length _tg_138)=0))
	}
	function test_fix_11() public {
		vm.prank(0x54df9511449a6ad5400000000000000000000000);
		depositlog11.logCreated(0x0000000000000000000000000000000000000000); //logCreated__171("address(this).balance=38", 0, 0, 0)
	}
	function test_fix_12() public {
		vm.prank(0x24f7BA2F1ba6AD6Ce00000000000000000000000);
		depositlog12.setApprovedLogger(0x1E27000000000000000000000000000000000000, false); //setApprovedLogger__145("address(this).balance=38", 0, 0, 7719, false)
	}
	function test_fix_13() public {
		vm.prank(0x2ef212813d4F7CA3200000000000000000000000);
		depositlog13.approvedToLog(0x0000000000000000000000000000000000000000); //approvedToLog__125("address(this).balance=38", 0, 0, 0)
	}
}
