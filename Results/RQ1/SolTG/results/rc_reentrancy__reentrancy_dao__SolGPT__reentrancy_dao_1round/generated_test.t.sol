//Generated Test by TG
//[[['ReentrancyDAO', 'contract', 66, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender'], ['withdrawAll', 48, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender'], ['deposit', 65, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender']]]
import "forge-std/Test.sol";
import "../src/contract.sol";

contract fix_Test is Test {
	ReentrancyDAO reentrancydao0;
	ReentrancyDAO reentrancydao1;
	ReentrancyDAO reentrancydao2;
	function setUp() public {
		reentrancydao0 = new ReentrancyDAO();
		reentrancydao1 = new ReentrancyDAO();
		reentrancydao2 = new ReentrancyDAO();
	}
	function test_fix_0() public {
		vm.prank(0x1E27000000000000000000000000000000000000);
		reentrancydao0.deposit(); //deposit__65("address(this).balance=38", 0, 7719)
	}
	function test_fix_1() public {
		vm.prank(0x2a2d1e9966251fe2500000000000000000000000);
		reentrancydao1.withdrawAll(); //withdrawAll__48("address(this).balance=38", 0, 0)
	}
	function test_fix_2() public {
		vm.prank(0x3D9d5402A370e072f00000000000000000000000);
		vm.deal(0x3D9d5402A370e072f00000000000000000000000,  21239 wei );
		reentrancydao2.deposit{ value:  21239 wei }(); //deposit__65("address(this).balance=38", 21239, 0)
		vm.prank(0xc9045663D39363Aa000000000000000000000000);
		reentrancydao2.withdrawAll(); //withdrawAll__48("address(this).balance=2437", 0, 0)
	}
}
