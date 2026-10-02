// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

contract airDrop {
	function transfer(address from, address caddress, address[] memory _tos, uint v, uint _decimals)  public returns (bool) {
	require(_tos.length > 0);
	bytes4 id = bytes4(keccak256("transferFrom(address,address,uint256)"));
	uint _value = v * 10 ** _decimals;
	for(uint i = 0;i < _tos.length;i++){
	{ (bool _s, bytes memory _d) = caddress.call(abi.encodeWithSelector(id, from, _tos[i], _value)); _d; if (! _s) {
	revert();} }
	}
	return true;
	}

}
