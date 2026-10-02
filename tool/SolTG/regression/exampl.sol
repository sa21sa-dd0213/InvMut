// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

contract A{
  uint a;
//  constructor(uint i) {a = i;}
  function set(uint j) public {a = j;}
  function f(uint x) public returns (bool){
    if (a < x) {
      assert(true);
      return true;
    } else {
      return false;
    }
  }
}