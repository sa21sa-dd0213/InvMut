// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import {Test} from "forge-std/Test.sol";
import {RewardVault} from "../src/RewardVault.sol";

contract InvMutTest is Test {
    uint256 internal constant VALUE_CAP = 1000000000000000000000000000000;
    RewardVault c;
    bool __obsd;
    uint256 __snap;

    function setUp() public {
        c = new RewardVault();
    }

    function _run(uint256 depositAmount) internal {
        depositAmount = bound(depositAmount, 0, 1000000000000000000000000000000);
        vm.deal(address(this), VALUE_CAP);
        vm.deal(address(c), VALUE_CAP);
        vm.assume(address(this).balance >= depositAmount);
        try c.deposit{value: depositAmount}() {} catch { return; }
        try c.withdraw() {} catch { return; }
        assertTrue(__obsd && __snap == 0);
    }

    function testFuzz_run(uint256 depositAmount) public {
        _run(depositAmount);
    }

    receive() external payable {
        if (!__obsd) {
            __obsd = true;
            __snap = c.balance(address(this));
        }
    }
}
