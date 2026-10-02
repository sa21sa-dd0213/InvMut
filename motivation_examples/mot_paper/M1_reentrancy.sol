// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

contract RewardVault {
    address public owner = msg.sender;
    uint256 public rewardRate = 100;
    mapping(address => uint256) public balance;
    mapping(address => uint256) public reward;
    mapping(address => uint256) public rateSnapshot;

    function deposit() external payable {
        balance[msg.sender] += msg.value;
        rateSnapshot[msg.sender] = rewardRate;
    }

    function setRewardRate(uint256 r) external {
        require(msg.sender == owner);
        rewardRate = r;
    }

    function claim() external returns (uint256 a) {
        a = balance[msg.sender] * rateSnapshot[msg.sender];
        reward[msg.sender] += a;
    }

    function withdraw() external {
        uint256 a = balance[msg.sender];
        require(a > 0);
        (bool ok,) = msg.sender.call{value: a}("");
        require(ok);
        balance[msg.sender] = 0;
    }
}
