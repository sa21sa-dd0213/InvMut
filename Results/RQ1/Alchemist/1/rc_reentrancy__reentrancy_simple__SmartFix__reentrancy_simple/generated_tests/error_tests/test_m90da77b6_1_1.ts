import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant detection - overflow check removal", function () {
  it("should revert on original contract when overflow occurs but succeed on mutant without the require check", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First add a small balance to have a baseline
    const smallAmount = ethers.parseEther("1");
    await instance.connect(owner).addToBalance({ value: smallAmount });

    // Get current balance
    const currentBalance = await instance.getBalance(owner.address);

    // Calculate value that would cause overflow: max uint256 - currentBalance + 1
    const maxUint256 = ethers.MaxUint256;
    const overflowValue = maxUint256 - currentBalance + BigInt(1);

    // This transaction should revert on the original (with require check)
    // but pass on the mutant (without require check)
    await expect(
      instance.connect(owner).addToBalance({ value: overflowValue })
    ).to.be.reverted;
  });
});