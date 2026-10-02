//Generated Test by TG
//[[['Wallet', 'contract', 126, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender'], ['deposit', 46, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender'], ['withdraw', 77, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'uint256', 'amount'], ['refund', 100, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender'], ['migrateTo', 125, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'address', 'to']]]
import "forge-std/Test.sol";
import "../src/contract.sol";

contract fix_Test is Test {
	Wallet wallet0;
	Wallet wallet1;
	Wallet wallet2;
	Wallet wallet3;
	function setUp() public {
		wallet0 = new Wallet();
		wallet1 = new Wallet();
		wallet2 = new Wallet();
		wallet3 = new Wallet();
	}
	function test_fix_0() public {
		vm.prank(0x1B6B5370AC2cF485200000000000000000000000);
		wallet0.migrateTo(0x0000000000000000000000000000000000000000); //migrateTo__125("address(this).balance=2438", 0, 0, 0)
	}
	function test_fix_1() public {
		vm.prank(0xdFB5b4cfF50E1432000000000000000000000000);
		wallet1.refund(); //refund__100("address(this).balance=38", 0, 0)
	}
	function test_fix_2() public {
		vm.prank(0x1E27000000000000000000000000000000000000);
		wallet2.withdraw( 0); //withdraw__77("address(this).balance=21238", 0, 7719, 0)
	}
	function test_fix_3() public {
		vm.prank(0x1E27000000000000000000000000000000000000);
		wallet3.deposit(); //deposit__46("address(this).balance=38", 0, 7719)
	}
}
