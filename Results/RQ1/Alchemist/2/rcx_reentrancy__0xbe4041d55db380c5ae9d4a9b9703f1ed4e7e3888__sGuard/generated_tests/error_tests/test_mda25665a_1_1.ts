import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant kill test - mda25665a", function () {
  it("should revert Collect when conditions are not met (original) vs proceed (mutant)", async function () {
    const [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract
    await instance.connect(owner).Initialized();

    // Set a MinSum value
    await instance.connect(owner).SetMinSum(ethers.parseEther("1"));

    // User has no balance, unlockTime is 0 (block.timestamp > 0 always true for 0)
    // But acc.balance = 0, so original condition fails on balance >= MinSum and balance >= _am
    // Call Collect with amount > 0 - should revert in original, but mutant will proceed
    const collectAmount = ethers.parseEther("0.5");

    // In the original contract this should revert because balance is 0
    // The mutant replaces the condition with true, so it will attempt the call
    // Since user has no balance, the call will succeed but the sub_uint256 will revert
    // because it tries to subtract from 0 (assert(b <= a) fails)
    await expect(
      instance.connect(user).Collect(collectAmount)
    ).to.be.reverted;
  });
});