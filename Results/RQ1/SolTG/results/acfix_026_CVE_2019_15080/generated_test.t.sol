//Generated Test by TG
//[[['Owned', 'contract', 33, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender'], ['owned', 9, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender'], ['transferOwnership', 32, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'address', '_newOwner']], [['ERC20', 'contract', 354, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'uint256', '_initialSupply', 'string', '_tokenName', 'string', '_tokenSymbol'], ['transfer', 222, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'address', '_to', 'uint256', '_value'], ['transferFrom', 309, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'address', '_from', 'address', '_to', 'uint256', '_amount'], ['approve', 337, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'address', '_spender', 'uint256', '_amount'], ['allowance', 353, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'address', '_owner', 'address', '_spender']], [['MorphToken', 'contract', 583, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender'], ['blacklistAccount', 499, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'address', '_target', 'bool', '_isBlacklisted'], ['mintTokens', 534, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'uint256', '_mintedAmount'], ['burn', 582, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'uint256', '_value']]]
import "forge-std/Test.sol";
import "../src/contract.sol";

contract fix_Test is Test {
	Owned owned0;
	ERC20 erc200;
	MorphToken morphtoken0;
	Owned owned1;
	ERC20 erc201;
	MorphToken morphtoken1;
	Owned owned2;
	ERC20 erc202;
	MorphToken morphtoken2;
	Owned owned3;
	ERC20 erc203;
	MorphToken morphtoken3;
	Owned owned4;
	ERC20 erc204;
	MorphToken morphtoken4;
	Owned owned5;
	ERC20 erc205;
	MorphToken morphtoken5;
	function setUp() public {
		morphtoken0 = new MorphToken();
		morphtoken1 = new MorphToken();
		morphtoken2 = new MorphToken( 2,0),0));
		morphtoken3 = new MorphToken( 1,0),0));
		morphtoken4 = new MorphToken();
		morphtoken5 = new MorphToken();
	}
	function test_fix_0() public {
		vm.prank(0x78012b198Cd441a5000000000000000000000000);
		morphtoken0.transferOwnership( 0); //transferOwnership__32("address(this).balance=38", 0, 0, 0)
	}
	function test_fix_1() public {
		vm.prank(0x1f69a6076C1CE811b00000000000000000000000);
		morphtoken1.owned(); //owned__9("address(this).balance=38", 0, 0)
	}
	function test_fix_2() public {
		vm.prank(0x30618ADAd029866aB00000000000000000000000);
		morphtoken2.allowance( 0, 1); //allowance__353("address(this).balance=0", 0, 0, 0, 1)
	}
	function test_fix_3() public {
		vm.prank(0x1000000000000000000000000000000000000000);
		morphtoken3.approve( 0, 1); //approve__337("address(this).balance=1", 0, 1, 0, 1)
	}
	function test_fix_4() public {
		vm.prank(0x9850000000000000000000000000000000000000);
		morphtoken4.blacklistAccount(0x52F6000000000000000000000000000000000000, false); //blacklistAccount__499("address(this).balance=38", 0, 2437, 21238, false)
	}
	function test_fix_5() public {
	}
}
