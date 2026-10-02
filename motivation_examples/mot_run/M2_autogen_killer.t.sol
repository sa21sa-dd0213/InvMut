// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
import {Test} from "forge-std/Test.sol";
import {RewardVault} from "../src/RewardVault.sol";
contract InvMutTest is Test {
    RewardVault c;
    function setUp() public { c = new RewardVault(); }
    function testFuzz_property(uint256 amount, uint256 rate) public {
        vm.assume(amount > 0 && amount <= 1e30);
        vm.assume(rate <= 1e18);
        address depositor = address(0x1000);
        vm.deal(depositor, amount);
        vm.prank(depositor);
        c.deposit{value: amount}();
        vm.prank(c.owner());
        c.setRewardRate(rate);
        vm.prank(depositor);
        uint256 claimed = c.claim();
        assertTrue(claimed > 0);
    }
}