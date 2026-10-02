//Generated Test by TG
//[[['ERCDDAToken', 'contract', 279, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'uint256', 'initialSupply', 'string', 'tokenName', 'string', 'tokenSymbol'], ['owned', 54, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender'], ['transfer', 199, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'address', '_to', 'uint256', '_value'], ['freezeAccount', 220, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'address', 'target', 'bool', 'freeze'], ['burn', 258, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'uint256', '_value'], ['mintToken', 278, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'address', 'target', 'uint256', 'mintedAmount']]]
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
		ercddatoken4 = new ERCDDAToken( 0,0),0));
	}
	function test_fix_0() public {
		vm.prank(0x20dA909e0ABB29bB900000000000000000000000);
		ercddatoken0.mintToken(0x0000000000000000000000000000000000000000, 1); //mintToken__278("address(this).balance=0", 0, 0, 0, 1)
	}
	function test_fix_1() public {
		vm.prank(0x45E1FD7fdEF755D3800000000000000000000000);
		ercddatoken1.burn( 1); //burn__258("address(this).balance=0", 0, 0, 1)
	}
	function test_fix_2() public {
		vm.prank(0x3832845Fb9Adf3ACF00000000000000000000000);
		ercddatoken2.freezeAccount(0x0000000000000000000000000000000000000000, false); //freezeAccount__220("address(this).balance=0", 0, 0, 0, false)
	}
	function test_fix_3() public {
		vm.prank(0x4000000000000000000000000000000000000000);
		ercddatoken3.transfer(0x2000000000000000000000000000000000000000, 3); //transfer__199("address(this).balance=1", 0, 4, 2, 3)
	}
	function test_fix_4() public {
		vm.prank(0x234b6adafc447758B00000000000000000000000);
		ercddatoken4.owned(); //owned__54("address(this).balance=0", 0, 0)
	}
}
