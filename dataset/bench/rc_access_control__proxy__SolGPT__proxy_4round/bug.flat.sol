// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

contract Proxy {

  address owner;

  constructor() public {
    owner = payable(msg.sender);
  }

  function forward(address callee, bytes memory _data) public {

    { (bool _s,) = callee.delegatecall(_data); require(_s); }
  }

}
