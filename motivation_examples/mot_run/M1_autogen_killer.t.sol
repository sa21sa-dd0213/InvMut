// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
import {Test} from "forge-std/Test.sol";
import {RewardVault} from "../src/RewardVault.sol";
contract InvMutTest is Test {
    RewardVault c; bool observed; uint256 snap;
    function setUp() public { c = new RewardVault(); }
    function testFuzz_run(uint256 amount, uint256 newRate) public {
        amount = bound(amount, 1, 1e30);
        vm.deal(address(this), 1e31);
        vm.assume(address(this).balance >= amount);
        c.setRewardRate(newRate);
        c.deposit{value: amount}();
        observed = false;
        c.withdraw();
        assertTrue(snap == 0);
    }
    receive() external payable {
        if (!observed) { observed = true; snap = c.balance(address(this)); }
    }
}