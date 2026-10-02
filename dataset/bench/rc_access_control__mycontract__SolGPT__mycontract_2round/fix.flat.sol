// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

contract MyContract {

    address owner;

    constructor() public {
        owner = payable(msg.sender);
    }

    function sendTo(address receiver, uint amount) public {
        require(msg.sender == owner);
        require(receiver != address(0));
        require(amount > 0);
        payable(receiver).transfer(amount);
    }
}
