import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrancy_bonus mutant m7fc86598 detection", function () {
  it("should revert when external call fails due to recipient contract reverting", async function () {
    const [owner, recipient] = await ethers.getSigners();
    
    // Deploy the Reentrancy_bonus contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("Reentrancy_bonus");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a malicious contract that reverts on receive
    const MaliciousFactory = await ethers.getContractFactory("MaliciousRecipient");
    const malicious = await MaliciousFactory.deploy();
    await malicious.waitForDeployment();
    
    // Call getFirstWithdrawalBonus with the malicious contract address
    // This will trigger withdrawReward which sends ether to malicious
    // The malicious contract reverts, so the original contract should revert
    await expect(
      instance.connect(owner).getFirstWithdrawalBonus(await malicious.getAddress())
    ).to.be.reverted;
    
    // Verify that the reward was NOT credited (state unchanged due to revert)
    // In the mutant, the require(success) is missing, so the transaction might succeed
    // and the reward would be zeroed out incorrectly
    const rewardBalance = await instance.rewardsForA(await malicious.getAddress());
    expect(rewardBalance).to.equal(0); // Should still be 0 because the reward was never successfully claimed
  });
});

// Helper contract that reverts on receive
contract MaliciousRecipient {
  receive() external payable {
    revert("I refuse to accept ETH");
  }
}