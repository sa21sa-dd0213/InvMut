// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

contract keepMyEther {
    mapping(address => uint256) public balances;

    fallback() external payable {
        balances[msg.sender] += msg.value;
    }

    function withdraw() public {

        msg.sender.call{value: balances[msg.sender]}("");
        balances[msg.sender] = 0;
    }
}
