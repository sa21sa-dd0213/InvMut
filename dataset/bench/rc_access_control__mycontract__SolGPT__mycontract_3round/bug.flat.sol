// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

contract MyContract {

    address owner;

    constructor() public {
        owner = payable(msg.sender);
    }

    function sendTo(address receiver, uint amount) public {

        require(tx.origin == owner);
        payable(receiver).transfer(amount);
    }

}
