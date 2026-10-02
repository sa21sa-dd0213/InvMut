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
        balance[msg.sender] = 0;
        (bool ok,) = msg.sender.call{value: a}("");
        require(ok);
    }
}

contract InvMutTest {
    C c;
    constructor() { c = new C(); }
    function __ESBMC_reverted() internal returns (bool) {}
    function __ESBMC_assume(bool) internal pure {}
    function run(uint amount, uint256 r1, uint256 r2) public payable { __ESBMC_assume(address(c).balance >= 1000000000000000000000000); require(address(this).balance >= (amount));
        require(address(this).balance >= amount);
        c.deposit{value: amount}(); if (__ESBMC_reverted()) return;
        c.setRewardRate(r1); if (__ESBMC_reverted()) return;
        uint256 snap = c.rateSnapshot(address(this)); if (__ESBMC_reverted()) return;
        c.setRewardRate(r2); if (__ESBMC_reverted()) return;
        uint256 claimed = c.claim(); if (__ESBMC_reverted()) return;
        assert(claimed == amount * snap);
    }
    receive() external payable {}
}