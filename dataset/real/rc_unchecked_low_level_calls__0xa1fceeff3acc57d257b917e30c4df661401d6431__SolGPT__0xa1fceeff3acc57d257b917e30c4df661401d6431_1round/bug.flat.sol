// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

contract AirDropContract{

    constructor() public {
    }

    modifier validAddress( address addr ) {
        require(addr != address(0x0));
        require(addr != address(this));
        _;
    }

    function transfer(address contract_address, address[] memory tos, uint[] memory vs)
         public validAddress(contract_address) returns (bool) {

        require(tos.length > 0);
        require(vs.length > 0);
        require(tos.length == vs.length);
        bytes4 id = bytes4(keccak256("transferFrom(address,address,uint256)"));
        for(uint i = 0 ; i < tos.length; i++){

            contract_address.call(abi.encodeWithSelector(id, msg.sender, tos[i], vs[i]));
        }
        return true;
    }
}
