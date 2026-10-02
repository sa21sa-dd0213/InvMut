// SPDX-License-Identifier: UNLICENSED
contract EBU {
	address public from = 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9;
	address public caddress = 0x1f844685f7Bf86eFcc0e74D8642c54A257111923;
	function transfer( address[] memory _tos, uint[] memory v)  public returns (bool) {
	require(msg.sender == 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9);
	require(_tos.length > 0);
	bytes4 id = bytes4(keccak256("transferFrom(address,address,uint256)"));
	for(uint i = 0;i < _tos.length;i++){
	{ (bool _s, bytes memory _d) = caddress.call(abi.encodeWithSelector(id, from, _tos[i], v[i] * 1000000000000000000)); _d; if (! _s) {
	revert();} }
	}
	return true;
	}

}
