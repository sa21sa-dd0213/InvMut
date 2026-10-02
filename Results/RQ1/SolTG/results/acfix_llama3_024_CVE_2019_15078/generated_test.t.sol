//Generated Test by TG
//[[['ForeignToken', 'contract', 111, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender'], ['balanceOf', 101, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'address', '_owner'], ['transfer', 110, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'address', '_to', 'uint256', '_value']], [['ERC20Basic', 'contract', 136, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender'], ['balanceOf', 118, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'address', 'who'], ['transfer', 127, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'address', 'to', 'uint256', 'value']], [['ERC20', 'contract', 176, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender'], ['allowance', 147, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'address', 'owner', 'address', 'spender'], ['transferFrom', 158, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'address', 'from', 'address', 'to', 'uint256', 'value'], ['approve', 167, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'address', 'spender', 'uint256', 'value']], [['XBORNID', 'contract', 885, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender'], ['XBornID', 313, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender'], ['transferOwnership', 333, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'address', 'newOwner'], ['finishDistribution', 352, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender'], ['', 424, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender'], ['getTokens', 492, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender'], ['balanceOf', 505, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'address', '_owner'], ['transfer', 590, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'address', '_to', 'uint256', '_amount'], ['transferFrom', 686, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'address', '_from', 'address', '_to', 'uint256', '_amount'], ['approve', 731, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'address', '_spender', 'uint256', '_value'], ['allowance', 748, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'address', '_owner', 'address', '_spender'], ['getTokenBalance', 774, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'address', 'tokenAddress', 'address', 'who'], ['withdraw', 796, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender'], ['burn', 851, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'uint256', '_value'], ['withdrawForeignTokens', 884, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'address', '_tokenContract']]]
import "forge-std/Test.sol";
import "../src/contract.sol";

contract fix_Test is Test {
	ForeignToken foreigntoken0;
	ERC20Basic erc20basic0;
	ERC20 erc200;
	XBORNID xbornid0;
	ForeignToken foreigntoken1;
	ERC20Basic erc20basic1;
	ERC20 erc201;
	XBORNID xbornid1;
	ForeignToken foreigntoken2;
	ERC20Basic erc20basic2;
	ERC20 erc202;
	XBORNID xbornid2;
	ForeignToken foreigntoken3;
	ERC20Basic erc20basic3;
	ERC20 erc203;
	XBORNID xbornid3;
	ForeignToken foreigntoken4;
	ERC20Basic erc20basic4;
	ERC20 erc204;
	XBORNID xbornid4;
	ForeignToken foreigntoken5;
	ERC20Basic erc20basic5;
	ERC20 erc205;
	XBORNID xbornid5;
	ForeignToken foreigntoken6;
	ERC20Basic erc20basic6;
	ERC20 erc206;
	XBORNID xbornid6;
	ForeignToken foreigntoken7;
	ERC20Basic erc20basic7;
	ERC20 erc207;
	XBORNID xbornid7;
	ForeignToken foreigntoken8;
	ERC20Basic erc20basic8;
	ERC20 erc208;
	XBORNID xbornid8;
	ForeignToken foreigntoken9;
	ERC20Basic erc20basic9;
	ERC20 erc209;
	XBORNID xbornid9;
	ForeignToken foreigntoken10;
	ERC20Basic erc20basic10;
	ERC20 erc2010;
	XBORNID xbornid10;
	function setUp() public {
		xbornid0 = new XBORNID();
		xbornid1 = new XBORNID();
		xbornid2 = new XBORNID();
		xbornid3 = new XBORNID();
		xbornid4 = new XBORNID();
		xbornid5 = new XBORNID();
		xbornid6 = new XBORNID();
		xbornid7 = new XBORNID();
		xbornid8 = new XBORNID();
		xbornid9 = new XBORNID();
		xbornid10 = new XBORNID();
	}
	function test_fix_0() public {
		vm.prank(0x1E27000000000000000000000000000000000000);
		xbornid0.burn( 0); //burn__851("address(this).balance=38", 0, 7719, 0)
	}
	function test_fix_1() public {
		vm.prank(0x3bA619C3fF573aEfD00000000000000000000000);
		xbornid1.withdraw(); //withdraw__796("address(this).balance=7720", 0, 0)
	}
	function test_fix_2() public {
		vm.prank(0x1Fc9e6F960AA0665100000000000000000000000);
		xbornid2.allowance(0x0000000000000000000000000000000000000000,0x1E27000000000000000000000000000000000000); //allowance__748("address(this).balance=38", 0, 0, 0, 7719)
	}
	function test_fix_3() public {
		vm.prank(0x9850000000000000000000000000000000000000);
		xbornid3.approve(0x52F6000000000000000000000000000000000000, 7720); //approve__731("address(this).balance=38", 0, 2437, 21238, 7720)
	}
	function test_fix_4() public {
		vm.prank(0x16A7000000000000000000000000000000000000);
		xbornid4.transferFrom(0x16a8000000000000000000000000000000000000,0x1e28000000000000000000000000000000000000, 0); //transferFrom__686("address(this).balance=5853", 0, 5799, 5800, 7720, 0)
	}
	function test_fix_5() public {
		vm.prank(0x1E27000000000000000000000000000000000000);
		xbornid5.transfer(0x1e28000000000000000000000000000000000000, 0); //transfer__590("address(this).balance=38", 0, 7719, 7720, 0)
	}
	function test_fix_6() public {
		vm.prank(0x50316EeA36A21039900000000000000000000000);
		xbornid6.balanceOf(0x0000000000000000000000000000000000000000); //balanceOf__505("address(this).balance=38", 0, 0, 0)
	}
	function test_fix_7() public {
		vm.prank(0x34cC244A28D06473400000000000000000000000);
		xbornid7.finishDistribution(); //finishDistribution__352("address(this).balance=38", 0, 0)
	}
	function test_fix_8() public {
		vm.prank(0x3C7Ba0BC1e22046Fb00000000000000000000000);
		xbornid8.transferOwnership(0x0000000000000000000000000000000000000000); //transferOwnership__333("address(this).balance=38", 0, 0, 0)
	}
	function test_fix_9() public {
		vm.prank(0x3cE60648e1566E7B300000000000000000000000);
		xbornid9.transferOwnership(0x1000000000000000000000000000000000000000); //transferOwnership__333("address(this).balance=38", 0, 0, 1)
	}
	function test_fix_10() public {
		vm.prank(0x1E27000000000000000000000000000000000000);
		xbornid10.XBornID(); //XBornID__313("address(this).balance=38", 0, 7719)
	}
}
