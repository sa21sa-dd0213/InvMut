import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant mb0678337 - overflow protection", function () {
  it("should revert on deposit that would cause overflow, but mutant allows it", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First deposit to create a non-zero balance
    const initialDeposit = ethers.parseEther("1");
    await instance.connect(owner).deposit({ value: initialDeposit });
    
    // Calculate amount that would cause overflow when added to current balance
    // Current balance is 1 ether = 10^18 wei
    // Max uint256 is ~1.15e77, so we need amount > max - currentBalance
    const maxUint256 = ethers.MaxUint256;
    const currentBalance = await instance.connect(owner).withdraw(0); // Not needed, just conceptual
    
    // Overflow amount: maxUint256 - currentBalance + 1
    const overflowAmount = maxUint256 - initialDeposit + 1n;
    
    // This should revert on original (assert fails) but may pass on mutant
    await expect(
      instance.connect(owner).deposit({ value: overflowAmount })
    ).to.be.reverted;
  });
});