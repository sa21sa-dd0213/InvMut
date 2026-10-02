// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

contract C {
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

contract InvMutTest {
    C c;
    bool __obsd;
    uint256 __snap;
    constructor() { c = new C(); }
    function __ESBMC_reverted() internal returns (bool) {}
    function __ESBMC_assume(bool) internal pure {}
    function run(uint256 depositAmount) public payable { __ESBMC_assume(address(c).balance >= 1000000000000000000000000); require(address(this).balance >= (depositAmount));
        require(address(this).balance >= depositAmount);
        c.deposit{value: depositAmount}(); if (__ESBMC_reverted()) return;
        c.withdraw(); if (__ESBMC_reverted()) return;
        assert(__obsd && __snap == 0);
    }
    receive() external payable {
        if (!__obsd) {
            __obsd = true;
            __snap = c.balance(address(this));
        }
    }
}