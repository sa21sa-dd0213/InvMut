//Generated Test by TG
//[[['ERCDDAToken', 'contract', 277, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'uint256', 'initialSupply', 'string', 'tokenName', 'string', 'tokenSymbol'], ['owned', 52, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender'], ['transfer', 197, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'address', '_to', 'uint256', '_value'], ['freezeAccount', 218, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'address', 'target', 'bool', 'freeze'], ['burn', 256, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'uint256', '_value'], ['mintToken', 276, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'address', 'target', 'uint256', 'mintedAmount']]]
import "forge-std/Test.sol";
import "../src/contract.sol";

contract fix_Test is Test {
	ERCDDAToken ercddatoken0;
	ERCDDAToken ercddatoken1;
	ERCDDAToken ercddatoken2;
	ERCDDAToken ercddatoken3;
	ERCDDAToken ercddatoken4;
	function setUp() public {
		ercddatoken0 = new ERCDDAToken( 1,0),0));
		ercddatoken1 = new ERCDDAToken( 2,0),0));
		ercddatoken2 = new ERCDDAToken( 0,0),0));
		ercddatoken3 = new ERCDDAToken( 4,0),0));
		ercddatoken4 = new ERCDDAToken( 1,0),0));
	}
	function test_fix_0() public {
		vm.prank(0x2A9822D2a1E9769e100000000000000000000000);
		ercddatoken0.mintToken(0x0000000000000000000000000000000000000000, 1); //mintToken__276("address(this).balance=0", 0, 0, 0, 1)
	}
	function test_fix_1() public {
		vm.prank(0x552Ac853580bD8c1900000000000000000000000);
		ercddatoken1.burn( 1); //burn__256("address(this).balance=0", 0, 0, 1)
	}
	function test_fix_2() public {
		vm.prank(0x12B26CACCf090658600000000000000000000000);
		ercddatoken2.freezeAccount(0x0000000000000000000000000000000000000000, false); //freezeAccount__218("address(this).balance=0", 0, 0, 0, false)
	}
	function test_fix_3() public {
		vm.prank(0x4000000000000000000000000000000000000000);
		ercddatoken3.transfer(0x2000000000000000000000000000000000000000, 3); //transfer__197("address(this).balance=1", 0, 4, 2, 3)
	}
	function test_fix_4() public {
		vm.prank(0x5b0b5DFED0E59B30000000000000000000000000);
		ercddatoken4.owned(); //owned__52("address(this).balance=0", 0, 0)
	}
}
