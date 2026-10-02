// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

contract EtherLotto {

    uint constant TICKET_AMOUNT = 10;

    uint constant FEE_AMOUNT = 1;

    address public bank;

    uint public pot;

    constructor() {
        bank = payable(msg.sender);
    }

    function play()  public payable {

        assert(msg.value == TICKET_AMOUNT);

        pot += msg.value;

        uint random = uint(keccak256(abi.encodePacked(block.timestamp))) % 2;

        if (random == 0) {

            payable(bank).transfer(FEE_AMOUNT);

            payable(msg.sender).transfer(pot - FEE_AMOUNT);

            pot = 0;
        }
    }

}
