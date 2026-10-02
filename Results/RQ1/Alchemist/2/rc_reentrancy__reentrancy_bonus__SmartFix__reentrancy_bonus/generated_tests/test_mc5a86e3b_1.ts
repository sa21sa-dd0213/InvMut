import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrancy_bonus mutant mc5a86e3b - kill test", function () {
  it("should revert on second getFirstWithdrawalBonus call for same recipient", async function () {
    const [owner, recipient] = await ethers.getSigners();
    
    // Deploy contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("Reentrancy_bonus");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First call should succeed
    await expect(
      instance.connect(recipient).getFirstWithdrawalBonus(recipient.address)
    ).to.not.be.reverted;

    // Second call should revert because claimedBonus[recipient] is already true
    await expect(
      instance.connect(recipient).getFirstWithdrawalBonus(recipient.address)
    ).to.be.reverted;
  });
});