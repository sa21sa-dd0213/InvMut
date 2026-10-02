//Generated Test by TG
//[[['Proxy', 'contract', 36, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender'], ['forward', 35, 'state_type', 'state', 'uint', 'msg.value', 'address', 'msg.sender', 'address', 'callee', 'bytes', '_data']]]
import "forge-std/Test.sol";
import "../src/contract.sol";

contract fix_Test is Test {
	Proxy proxy0;
	function setUp() public {
		proxy0 = new Proxy();
	}
	function test_fix_0() public {
		vm.prank(0x31e9aBBdB3462Fe0500000000000000000000000);
		proxy0.forward(0x0000000000000000000000000000000000000000, ((bytes_tuple_accessor_array _tg_190)=store(store(store(store(const-array(INT, 13), 1, 173), 3, 114), 0, 111), 2, 207))); //forward__35("address(this).balance=38", 0, 0, 0, ((bytes_tuple_accessor_array _tg_190)=store(store(store(store(const-array(INT, 13), 1, 173), 3, 114), 0, 111), 2, 207)))
	}
}
