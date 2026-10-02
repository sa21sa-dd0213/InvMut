//Generated Test by TG
//[[['Owned', 'contract', 33, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender'], ['owned', 9, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender'], ['transferOwnership', 32, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'address', 'newOwner']], [['TokenERC20', 'contract', 401, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'uint256', 'initialSupply', 'string', 'tokenName', 'string', 'tokenSymbol'], ['transfer', 208, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'address', '_to', 'uint256', '_value'], ['transferFrom', 248, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'address', '_from', 'address', '_to', 'uint256', '_value'], ['approve', 269, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'address', '_spender', 'uint256', '_value'], ['approveAndCall', 309, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'address', '_spender', 'uint256', '_value', 'bytes', '_extraData'], ['burn', 345, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'uint256', '_value'], ['burnFrom', 400, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'address', '_from', 'uint256', '_value']], [['RobotBTC', 'contract', 669, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'uint256', 'initialSupply', 'string', 'tokenName', 'string', 'tokenSymbol'], ['mintToken', 549, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'address', 'target', 'uint256', 'mintedAmount'], ['freezeAccount', 570, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'address', 'target', 'bool', 'freeze'], ['setPrices', 588, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'uint256', 'newSellPrice', 'uint256', 'newBuyPrice'], ['buy', 613, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender'], ['sell', 656, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'uint256', 'amount'], ['setExchange', 668, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'bool', 'istrue']]]
import "forge-std/Test.sol";
import "../src/contract.sol";

contract fix_Test is Test {
	Owned owned0;
	TokenERC20 tokenerc200;
	RobotBTC robotbtc0;
	Owned owned1;
	TokenERC20 tokenerc201;
	RobotBTC robotbtc1;
	Owned owned2;
	TokenERC20 tokenerc202;
	RobotBTC robotbtc2;
	Owned owned3;
	TokenERC20 tokenerc203;
	RobotBTC robotbtc3;
	Owned owned4;
	TokenERC20 tokenerc204;
	RobotBTC robotbtc4;
	Owned owned5;
	TokenERC20 tokenerc205;
	RobotBTC robotbtc5;
	Owned owned6;
	TokenERC20 tokenerc206;
	RobotBTC robotbtc6;
	Owned owned7;
	TokenERC20 tokenerc207;
	RobotBTC robotbtc7;
	function setUp() public {
		robotbtc0 = new RobotBTC();
		robotbtc1 = new RobotBTC();
		robotbtc2 = new RobotBTC( 1,0),0));
		robotbtc3 = new RobotBTC( 1,0),0));
		robotbtc4 = new RobotBTC( 1,0),0));
		robotbtc5 = new RobotBTC( 0,0),0));
		robotbtc6 = new RobotBTC( 2,0),0));
		robotbtc7 = new RobotBTC( 0,0),0));
	}
	function test_fix_0() public {
		vm.prank(0x2F29525F588EedA5900000000000000000000000);
		robotbtc0.transferOwnership( 0); //transferOwnership__32("address(this).balance=38", 0, 0, 0)
	}
	function test_fix_1() public {
		vm.prank(0x1bAE839cd077C7C1100000000000000000000000);
		robotbtc1.owned(); //owned__9("address(this).balance=38", 0, 0)
	}
	function test_fix_2() public {
		vm.prank(0x2000000000000000000000000000000000000000);
		robotbtc2.burnFrom( 0, 0); //burnFrom__400("address(this).balance=0", 0, 2, 0, 0)
	}
	function test_fix_3() public {
		vm.prank(0xEd74D0D31071920C000000000000000000000000);
		robotbtc3.burn( 1); //burn__345("address(this).balance=1", 0, 0, 1)
	}
	function test_fix_4() public {
		vm.prank(0x219270e9236d9039600000000000000000000000);
		robotbtc4.approveAndCall( 0, 0, ((bytes_tuple_accessor_length _tg_539)=0)); //approveAndCall__309("address(this).balance=0", 0, 0, 0, 0, ((bytes_tuple_accessor_length _tg_539)=0))
	}
	function test_fix_5() public {
		vm.prank(0x3dfd6A0CA01900f2c00000000000000000000000);
		robotbtc5.approve( 1, 0); //approve__269("address(this).balance=0", 0, 0, 1, 0)
	}
	function test_fix_6() public {
		vm.prank(0x2000000000000000000000000000000000000000);
		robotbtc6.transfer( 1, 1); //transfer__208("address(this).balance=0", 0, 2, 1, 1)
	}
	function test_fix_7() public {
		vm.prank(0x39C2D4B310620cd7900000000000000000000000);
		robotbtc7.setExchange( false); //setExchange__668("address(this).balance=0", 0, 0, false)
	}
}
