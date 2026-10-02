import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant m90da77b6 test", function () {
  it("should revert when adding value that would cause overflow, but mutant silently succeeds", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethert.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First add a small balance to the owner
    const initialDeposit = ethers.parseEther("1");
    await instance.connect(owner).addToBalance({ value: initialDeposit });

    // Now attempt to add a value that would overflow uint256 when added to existing balance
    const maxUint256 = ethers.MaxUint256;
    const overflowValue = maxUint256 - initialDeposit + 1n;

    // In the original contract, this should revert due to overflow check
    // In the mutant (no require), it will silently succeed and wrap the balance
    const tx = instance.connect(owner).addToBalance({ value: overflowValue });

    // The test expects a revert to catch the mutant (mutant won't revert)
    await expect(tx).to.be.reverted;
  });
});