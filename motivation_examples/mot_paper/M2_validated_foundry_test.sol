// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import {Test} from "forge-std/Test.sol";
import {RewardVault} from "../src/RewardVault.sol";

contract InvMutTest is Test {
    uint256 internal constant VALUE_CAP = 1000000000000000000000000000000;
    RewardVault c;

    function setUp() public {
        c = new RewardVault();
    }

    function _run(uint256 amount, uint256 r1, uint256 r2) internal {
        amount = bound(amount, 0, 1000000000000000000000000000000);
        vm.deal(address(this), VALUE_CAP);
        vm.deal(address(c), VALUE_CAP);
        vm.assume(address(this).balance >= amount);
        try c.deposit{value: amount}() {} catch { return; }
        try c.setRewardRate(r1) {} catch { return; }
        uint256 snap;
        try c.rateSnapshot(address(this)) returns (uint256 __r) { snap = __r; } catch { return; }
        try c.setRewardRate(r2) {} catch { return; }
        uint256 claimed;
        try c.claim() returns (uint256 __r) { claimed = __r; } catch { return; }
        assertTrue(claimed == amount * snap);
    }

    function testFuzz_run(uint256 amount, uint256 r1, uint256 r2) public {
        _run(amount, r1, r2);
    }

    receive() external payable {}
}
