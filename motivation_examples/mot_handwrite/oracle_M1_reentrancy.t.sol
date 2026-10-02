// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import {Test} from "forge-std/Test.sol";
import {RewardVault} from "../src/RewardVault.sol";

contract InvMutTest is Test {
    RewardVault c;
    uint256 hits;

    function setUp() public {
        c = new RewardVault();
        address victim = address(0xBEEF);
        vm.deal(victim, 5 ether);
        vm.prank(victim);
        c.deposit{value: 5 ether}();
        vm.deal(address(this), 1 ether);
    }

    function testRegression_reentrancy_cannot_overdraw() public {
        c.deposit{value: 1 ether}();
        c.withdraw();
        assertLe(address(this).balance, 1 ether);
    }

    receive() external payable {
        if (hits++ < 5) {
            try c.withdraw() {} catch {}
        }
    }
}
