//Generated Test by TG
//[[['MultiplicatorX3', 'contract', 107, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender'], ['', 9, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender'], ['withdraw', 32, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender'], ['Command', 56, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'address', 'adr', 'bytes', 'data'], ['multiplicate', 106, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'address', 'adr']]]
import "forge-std/Test.sol";
import "../src/contract.sol";

contract fix_Test is Test {
	MultiplicatorX3 multiplicatorx30;
	MultiplicatorX3 multiplicatorx31;
	MultiplicatorX3 multiplicatorx32;
	MultiplicatorX3 multiplicatorx33;
	function setUp() public {
		multiplicatorx30 = new MultiplicatorX3();
		multiplicatorx31 = new MultiplicatorX3();
		multiplicatorx32 = new MultiplicatorX3();
		multiplicatorx33 = new MultiplicatorX3();
	}
	function test_fix_0() public {
		vm.prank(0x30B6a38a7C6aa5c9100000000000000000000000);
		multiplicatorx30.multiplicate(0x0000000000000000000000000000000000000000); //multiplicate__106("address(this).balance=38", 0, 0, 0)
	}
	function test_fix_1() public {
		vm.prank(0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF);
		vm.deal(0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF,  1 wei );
		multiplicatorx31.multiplicate{ value:  1 wei }(0x8c00000000000000000000000000000000000000); //multiplicate__106("address(this).balance=18457", 1, 1461501637330902918203684832716283019655932542975, 2240)
	}
	function test_fix_2() public {
		vm.prank(0x616F181EC93c90ED000000000000000000000000);
		multiplicatorx32.Command(0x0000000000000000000000000000000000000000, ((bytes_tuple_accessor_length _tg_112)=0)); //Command__56("address(this).balance=38", 0, 0, 0, ((bytes_tuple_accessor_length _tg_112)=0))
	}
	function test_fix_3() public {
		vm.prank(0xb03a86E332De64B3000000000000000000000000);
		multiplicatorx33.withdraw(); //withdraw__32("address(this).balance=7720", 0, 0)
	}
}
