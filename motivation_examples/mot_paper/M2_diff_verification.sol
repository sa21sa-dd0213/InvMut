// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

contract RewardVault_ref {
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

contract RewardVault_mut {
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
        a = balance[msg.sender] * rewardRate;
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

contract Harness {
    RewardVault_ref p; RewardVault_mut m;
    function __ESBMC_reverted() internal returns (bool) {}
    function __ESBMC_assume(bool) internal pure {}
    receive() external payable {
    }

    constructor() { p = new RewardVault_ref(); m = new RewardVault_mut(); __ESBMC_assume(address(p).balance == address(m).balance); }
    function s0_deposit(uint256 __v) public payable {
        __ESBMC_assume(msg.value >= 2 * __v);
        p.deposit{value: __v}();
        m.deposit{value: __v}();
    }

    function s1_setRewardRate(uint256 a0) public {
        p.setRewardRate(a0);
        m.setRewardRate(a0);
    }

    function s2_claim() public {
        uint256 __invmut_vP = p.claim(); __ESBMC_assume(!__ESBMC_reverted());
        uint256 __invmut_vM = m.claim(); __ESBMC_assume(!__ESBMC_reverted());
        assert(__invmut_vP == __invmut_vM);
    }

    function s3_withdraw() public {
        p.withdraw();
        m.withdraw();
    }
}
