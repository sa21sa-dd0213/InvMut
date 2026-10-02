// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

contract Roulette {
    uint public pastBlockTime;

    constructor() public payable {}

    fallback() external payable {
        require(msg.value == 10 ether);

        require(block.timestamp > pastBlockTime);

        pastBlockTime = block.timestamp;
        if(block.number % 15 == 0) {
            payable(msg.sender).transfer(address(this).balance);
        }
    }
}
