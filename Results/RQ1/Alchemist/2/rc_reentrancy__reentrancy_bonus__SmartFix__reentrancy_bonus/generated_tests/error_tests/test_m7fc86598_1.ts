import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrancy_bonus mutant detection", function () {
  it("should detect removal of require(success) in withdrawReward by using a recipient that reverts", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Reentrancy_bonus");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a contract that always reverts when receiving ether
    const RevertingRecipient = await ethers.getContractFactory("RevertingRecipient");
    const revertingRecipient = await RevertingRecipient.deploy();
    await revertingRecipient.waitForDeployment();

    // First give a reward to the reverting recipient via getFirstWithdrawalBonus
    // This will call withdrawReward internally which will try to send ether
    // The original contract should revert because the call fails
    // The mutant will not revert, incorrectly zeroing the reward balance
    await expect(
      instance.connect(owner).getFirstWithdrawalBonus(await revertingRecipient.getAddress())
    ).to.be.reverted;

    // Verify that the reward was NOT cleared in the mutant (if it didn't revert)
    // This assertion only passes if the mutant actually reverted (which it shouldn't)
    // We check that the balance is still 100 if the transaction somehow didn't revert
    const rewardBalance = await instance.rewardsForA(await revertingRecipient.getAddress());
    expect(rewardBalance).to.equal(100);
  });
});