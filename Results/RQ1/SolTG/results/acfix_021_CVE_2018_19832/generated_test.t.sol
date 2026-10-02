//Generated Test by TG
//[[['ForeignToken', 'contract', 111, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender'], ['balanceOf', 101, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'address', '_owner'], ['transfer', 110, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'address', '_to', 'uint256', '_value']], [['ERC20Basic', 'contract', 136, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender'], ['balanceOf', 118, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'address', 'who'], ['transfer', 127, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'address', 'to', 'uint256', 'value']], [['ERC20', 'contract', 176, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender'], ['allowance', 147, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'address', 'owner', 'address', 'spender'], ['transferFrom', 158, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'address', 'from', 'address', 'to', 'uint256', 'value'], ['approve', 167, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'address', 'spender', 'uint256', 'value']], [['NewIntelTechMedia', 'contract', 885, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender'], ['NETM', 313, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender'], ['transferOwnership', 333, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'address', 'newOwner'], ['finishDistribution', 352, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender'], ['', 424, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender'], ['getTokens', 492, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender'], ['balanceOf', 505, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'address', '_owner'], ['transfer', 590, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'address', '_to', 'uint256', '_amount'], ['transferFrom', 686, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'address', '_from', 'address', '_to', 'uint256', '_amount'], ['approve', 731, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'address', '_spender', 'uint256', '_value'], ['allowance', 748, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'address', '_owner', 'address', '_spender'], ['getTokenBalance', 774, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'address', 'tokenAddress', 'address', 'who'], ['withdraw', 796, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender'], ['burn', 851, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'uint256', '_value'], ['withdrawForeignTokens', 884, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'address', '_tokenContract']]]
import "forge-std/Test.sol";
import "../src/contract.sol";

contract fix_Test is Test {
	ForeignToken foreigntoken0;
	ERC20Basic erc20basic0;
	ERC20 erc200;
	NewIntelTechMedia newinteltechmedia0;
	ForeignToken foreigntoken1;
	ERC20Basic erc20basic1;
	ERC20 erc201;
	NewIntelTechMedia newinteltechmedia1;
	ForeignToken foreigntoken2;
	ERC20Basic erc20basic2;
	ERC20 erc202;
	NewIntelTechMedia newinteltechmedia2;
	ForeignToken foreigntoken3;
	ERC20Basic erc20basic3;
	ERC20 erc203;
	NewIntelTechMedia newinteltechmedia3;
	ForeignToken foreigntoken4;
	ERC20Basic erc20basic4;
	ERC20 erc204;
	NewIntelTechMedia newinteltechmedia4;
	ForeignToken foreigntoken5;
	ERC20Basic erc20basic5;
	ERC20 erc205;
	NewIntelTechMedia newinteltechmedia5;
	ForeignToken foreigntoken6;
	ERC20Basic erc20basic6;
	ERC20 erc206;
	NewIntelTechMedia newinteltechmedia6;
	ForeignToken foreigntoken7;
	ERC20Basic erc20basic7;
	ERC20 erc207;
	NewIntelTechMedia newinteltechmedia7;
	ForeignToken foreigntoken8;
	ERC20Basic erc20basic8;
	ERC20 erc208;
	NewIntelTechMedia newinteltechmedia8;
	ForeignToken foreigntoken9;
	ERC20Basic erc20basic9;
	ERC20 erc209;
	NewIntelTechMedia newinteltechmedia9;
	ForeignToken foreigntoken10;
	ERC20Basic erc20basic10;
	ERC20 erc2010;
	NewIntelTechMedia newinteltechmedia10;
	function setUp() public {
		newinteltechmedia0 = new NewIntelTechMedia();
		newinteltechmedia1 = new NewIntelTechMedia();
		newinteltechmedia2 = new NewIntelTechMedia();
		newinteltechmedia3 = new NewIntelTechMedia();
		newinteltechmedia4 = new NewIntelTechMedia();
		newinteltechmedia5 = new NewIntelTechMedia();
		newinteltechmedia6 = new NewIntelTechMedia();
		newinteltechmedia7 = new NewIntelTechMedia();
		newinteltechmedia8 = new NewIntelTechMedia();
		newinteltechmedia9 = new NewIntelTechMedia();
		newinteltechmedia10 = new NewIntelTechMedia();
	}
	function test_fix_0() public {
		vm.prank(0x1E27000000000000000000000000000000000000);
		newinteltechmedia0.burn( 0); //burn__851("address(this).balance=38", 0, 7719, 0)
	}
	function test_fix_1() public {
		vm.prank(0x2DEFAE8081F60837200000000000000000000000);
		newinteltechmedia1.withdraw(); //withdraw__796("address(this).balance=7720", 0, 0)
	}
	function test_fix_2() public {
		vm.prank(0x5ffe16a7061365b8000000000000000000000000);
		newinteltechmedia2.allowance(0x0000000000000000000000000000000000000000,0x1E27000000000000000000000000000000000000); //allowance__748("address(this).balance=38", 0, 0, 0, 7719)
	}
	function test_fix_3() public {
		vm.prank(0x52F6000000000000000000000000000000000000);
		newinteltechmedia3.approve(0x52F6000000000000000000000000000000000000, 7720); //approve__731("address(this).balance=38", 0, 21238, 21238, 7720)
	}
	function test_fix_4() public {
		vm.prank(0x16a5000000000000000000000000000000000000);
		newinteltechmedia4.transferFrom(0x16A6000000000000000000000000000000000000,0x16A7000000000000000000000000000000000000, 0); //transferFrom__686("address(this).balance=38", 0, 5797, 5798, 5799, 0)
	}
	function test_fix_5() public {
		vm.prank(0x1E27000000000000000000000000000000000000);
		newinteltechmedia5.transfer(0x1e28000000000000000000000000000000000000, 0); //transfer__590("address(this).balance=8855", 0, 7719, 7720, 0)
	}
	function test_fix_6() public {
		vm.prank(0x13039649d4a5619F900000000000000000000000);
		newinteltechmedia6.balanceOf(0x0000000000000000000000000000000000000000); //balanceOf__505("address(this).balance=38", 0, 0, 0)
	}
	function test_fix_7() public {
		vm.prank(0x1905bF9Eae8EF6E8800000000000000000000000);
		newinteltechmedia7.finishDistribution(); //finishDistribution__352("address(this).balance=38", 0, 0)
	}
	function test_fix_8() public {
		vm.prank(0x3320999035F33104d00000000000000000000000);
		newinteltechmedia8.transferOwnership(0x0000000000000000000000000000000000000000); //transferOwnership__333("address(this).balance=38", 0, 0, 0)
	}
	function test_fix_9() public {
		vm.prank(0x7D8417C1b8230784000000000000000000000000);
		newinteltechmedia9.transferOwnership(0x1000000000000000000000000000000000000000); //transferOwnership__333("address(this).balance=38", 0, 0, 1)
	}
	function test_fix_10() public {
		vm.prank(0x1E27000000000000000000000000000000000000);
		newinteltechmedia10.NETM(); //NETM__313("address(this).balance=38", 0, 7719)
	}
}
