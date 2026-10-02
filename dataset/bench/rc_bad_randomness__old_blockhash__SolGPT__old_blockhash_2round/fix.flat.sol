// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

contract PredictTheBlockHashChallenge {
    struct Guess {
        uint block;
        bytes32 guess;
    }

    mapping(address => Guess) guesses;

    constructor() public payable {
        require(msg.value == 1 ether);
    }

    function lockInGuess(bytes32 hash) public payable {
        require(guesses[msg.sender].block == 0);
        require(msg.value == 1 ether);

        guesses[msg.sender].guess = hash;
        guesses[msg.sender].block = block.number + 1;
    }

    function settle() public {
        require(guesses[msg.sender].block != 0);
        require(block.number > guesses[msg.sender].block);

        bytes32 answer = keccak256(abi.encodePacked(blockhash(guesses[msg.sender].block)));

        guesses[msg.sender].block = 0;
        if (guesses[msg.sender].guess == answer) {
            require(address(this).balance >= 2 ether);
            payable(msg.sender).transfer(2 ether);
        }
    }
}
