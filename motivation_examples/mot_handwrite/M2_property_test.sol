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
    function run(uint256 amount, uint256 r1, uint256 r2) external payable {
        require(msg.value == amount);
        c.deposit{value: amount}();
        c.setRewardRate(r1);
        uint256 snap = c.rateSnapshot(address(this));
        c.setRewardRate(r2);
        uint256 claimed = c.claim();
        assert(claimed == amount * snap);
    }
    receive() external payable {}
}
