import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrancy_bonus mutant m7fc86598 test", function () {
  it("should revert when external call fails in withdrawReward (original behavior), but mutant should not revert", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy the contract
    const Factory = await ethers.getContractFactory("Reentrancy_bonus");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a malicious contract that will revert when receiving ether
    const MaliciousFactory = await ethers.getContractFactory("MaliciousReceiver");
    const malicious = await MaliciousFactory.deploy();
    await malicious.waitForDeployment();
    
    // Call getFirstWithdrawalBonus with the malicious contract as recipient
    // This will trigger withdrawReward which sends ether to the malicious contract
    // The malicious contract reverts on receive, so require(success) should revert
    // In the mutant without require(success), it will NOT revert
    const tx = instance.getFirstWithdrawalBonus(await malicious.getAddress());
    
    // The original contract should revert here
    // The mutant (without require) will not revert, so we expect it to NOT revert
    await expect(tx).to.not.be.reverted;
    
    // Additionally, verify the state: rewardsForA should be 0 (already set to 0 before call)
    // This confirms the function executed without reverting despite the failed call
    const rewardsAfter = await instance.rewardsForA(await malicious.getAddress());
    expect(rewardsAfter).to.equal(0);
  });
});