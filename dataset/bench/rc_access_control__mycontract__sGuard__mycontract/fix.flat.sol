// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

contract sGuard{

}

contract MyContract  is sGuard {

    address owner;

    constructor() public {
        owner = payable(msg.sender);
    }

    function sendTo(address receiver, uint amount) public {

        require(msg.sender == owner);
        payable(receiver).transfer(amount);
    }

}
