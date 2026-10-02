// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

contract sGuard{
  function add_uint256(uint256 a, uint256 b) internal pure returns (uint256) {
    uint256 c = a + b;
    assert(c >= a);
    return c;
  }

  bool internal locked_;
  constructor() {
    locked_ = false;
  }
  modifier nonReentrant_() {
    require(!locked_);
    locked_ = true;
    _;
    locked_ = false;
  }
}

 contract Reentrance  is sGuard {
     mapping (address => uint) userBalance;

     function getBalance(address u)  public view returns (uint) {
         return userBalance[u];
     }

      function addToBalance()  public nonReentrant_ payable {
         userBalance[msg.sender] = add_uint256(userBalance[msg.sender], msg.value);
     }

      function withdrawBalance()  public nonReentrant_ {

         { (bool _s, bytes memory _d) = msg.sender.call{value: userBalance[msg.sender]}(""); _d; if (! _s) {
             revert();
         } }
         userBalance[msg.sender] = 0;
     }
 }
