//Generated Test by TG
//[[['MultiplicatorX4', 'contract', 107, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender'], ['', 9, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender'], ['withdraw', 32, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender'], ['Command', 56, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'address', 'adr', 'bytes', 'data'], ['multiplicate', 106, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'address', 'adr']]]
import "forge-std/Test.sol";
import "../src/contract.sol";

contract fix_Test is Test {
	MultiplicatorX4 multiplicatorx40;
	MultiplicatorX4 multiplicatorx41;
	MultiplicatorX4 multiplicatorx42;
	MultiplicatorX4 multiplicatorx43;
	function setUp() public {
		multiplicatorx40 = new MultiplicatorX4();
		multiplicatorx41 = new MultiplicatorX4();
		multiplicatorx42 = new MultiplicatorX4();
		multiplicatorx43 = new MultiplicatorX4();
	}
	function test_fix_0() public {
		vm.prank(0x4ea38D7dd5Ba1e4e200000000000000000000000);
		multiplicatorx40.multiplicate(0x0000000000000000000000000000000000000000); //multiplicate__106("address(this).balance=38", 0, 0, 0)
	}
	function test_fix_1() public {
		vm.prank(0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF);
		vm.deal(0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF,  1 wei );
		multiplicatorx41.multiplicate{ value:  1 wei }(0x8c00000000000000000000000000000000000000); //multiplicate__106("address(this).balance=18457", 1, 1461501637330902918203684832716283019655932542975, 2240)
	}
	function test_fix_2() public {
		vm.prank(0x4EF4A3e7fDA065D5200000000000000000000000);
		multiplicatorx42.Command(0x0000000000000000000000000000000000000000, ((bytes_tuple_accessor_length _tg_112)=0)); //Command__56("address(this).balance=38", 0, 0, 0, ((bytes_tuple_accessor_length _tg_112)=0))
	}
	function test_fix_3() public {
		vm.prank(0x10ef40FaBaCDBDd0900000000000000000000000);
		multiplicatorx43.withdraw(); //withdraw__32("address(this).balance=7720", 0, 0)
	}
}
