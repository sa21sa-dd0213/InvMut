// SPDX-License-Identifier: UNLICENSED
contract EBU {
	function transfer(address from, address caddress, address[] memory _tos, uint[] memory v)  public returns (bool) {
	require(_tos.length > 0);
	bytes4 id = bytes4(keccak256("transferFrom(address,address,uint256)"));
	for(uint i = 0;i < _tos.length;i++){
	{ (bool _s, bytes memory _d) = caddress.call(abi.encodeWithSelector(id, from, _tos[i], v[i])); _d; if (! _s) {
	revert();} }
	}
	return true;
	}

}
