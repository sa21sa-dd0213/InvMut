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

contract Harness {
    RewardVault_ref p; RewardVault_mut m;
    uint8 __invmut_which; uint256 __invmut_snapP; uint256 __invmut_snapM;
    function __ESBMC_reverted() internal returns (bool) {}
    function __ESBMC_assume(bool) internal pure {}
    receive() external payable {
        if (__invmut_which == 1) __invmut_snapP = p.balance(address(this));
        else if (__invmut_which == 2) __invmut_snapM = m.balance(address(this));
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
        p.claim();
        m.claim();
    }

    function s3_withdraw(address k) public {
        __invmut_which = 1; p.withdraw(); __ESBMC_assume(!__ESBMC_reverted());
        __invmut_which = 2; m.withdraw(); __ESBMC_assume(!__ESBMC_reverted());
        __invmut_which = 0;
        uint256 __invmut_vP = p.balance(k);
        uint256 __invmut_vM = m.balance(k);
        assert(__invmut_snapP == __invmut_snapM && __invmut_vP == __invmut_vM);
    }
}
