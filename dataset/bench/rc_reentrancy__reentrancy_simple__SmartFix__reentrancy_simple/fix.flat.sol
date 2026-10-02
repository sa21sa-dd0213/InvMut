// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

 contract Reentrance {
     mapping (address => uint) userBalance;

     function getBalance(address u)  public view returns (uint) {
         return userBalance[u];
     }

     function addToBalance()  public payable {
         require(((userBalance[msg.sender] + msg.value) >= userBalance[msg.sender]));
         userBalance[msg.sender] += msg.value;
     }

     function withdrawBalance() public{

         uint256 tmp__1 = userBalance[msg.sender];
         userBalance[msg.sender] = 0;
         { (bool _s, bytes memory _d) = msg.sender.call{value: tmp__1}(""); _d; if (! _s) {
             revert();
         } }

     }
 }
