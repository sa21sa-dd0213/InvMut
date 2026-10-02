// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import {Test} from "forge-std/Test.sol";
import {RewardVault} from "../src/RewardVault.sol";

contract InvMutTest is Test {
    RewardVault c;

    function setUp() public {
        c = new RewardVault();
        vm.deal(address(this), 1 ether);
    }

    function testRegression_reward_equals_amount_times_rate() public {
        c.deposit{value: 1 ether}();
        uint256 a = c.claim();
        assertEq(a, 1 ether * 100);
    }

    receive() external payable {}
}
