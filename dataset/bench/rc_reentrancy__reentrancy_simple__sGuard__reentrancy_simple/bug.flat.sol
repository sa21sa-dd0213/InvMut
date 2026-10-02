// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

 contract Reentrance {
     mapping (address => uint) userBalance;

     function getBalance(address u)  public view returns (uint) {
         return userBalance[u];
     }

     function addToBalance()  public payable {
         userBalance[msg.sender] += msg.value;
     }

     function withdrawBalance() public{

         { (bool _s, bytes memory _d) = msg.sender.call{value: userBalance[msg.sender]}(""); _d; if (! _s) {
             revert();
         } }
         userBalance[msg.sender] = 0;
     }
 }
