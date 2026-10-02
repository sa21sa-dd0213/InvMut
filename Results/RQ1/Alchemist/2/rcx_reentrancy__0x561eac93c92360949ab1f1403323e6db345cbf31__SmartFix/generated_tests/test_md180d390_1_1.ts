import { expect } from "chai";
import { ethers } from "hardhat";

describe("BANK_SAFE mutant kill test - overflow protection removed", function () {
  it("should revert when depositing a value that causes integer overflow in balances mapping", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("BANK_SAFE");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, set MinSum to 0 so Collect can work later if needed
    await instance.SetMinSum(0);
    await instance.Initialized();

    // Get current balance of owner
    const initialBalance = await instance.balances(owner.address);

    // Calculate a deposit value that will cause overflow when added to initial balance
    const maxUint = ethers.MaxUint256;
    const depositAmount = maxUint - initialBalance + 1n;

    // Attempt to deposit - should revert in original due to overflow check
    await expect(
      instance.connect(owner).Deposit({ value: depositAmount })
    ).to.be.reverted;

    // Verify balance remains unchanged
    const finalBalance = await instance.balances(owner.address);
    expect(finalBalance).to.equal(initialBalance);
  });

  it("should detect mutant by checking balance after overflow deposit", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("BANK_SAFE");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Set MinSum to 0
    await instance.SetMinSum(0);
    await instance.Initialized();

    // First make a small deposit to have a baseline
    await instance.connect(owner).Deposit({ value: ethers.parseEther("1") });
    const balanceAfterDeposit = await instance.balances(owner.address);

    // Calculate overflow amount
    const maxUint = ethers.MaxUint256;
    const overflowAmount = maxUint - balanceAfterDeposit + 1n;

    // Try overflow deposit - original should revert, mutant might not
    try {
      const tx = await instance.connect(owner).Deposit({ value: overflowAmount });
      await tx.wait();

      // If we reach here, mutant is alive (no revert) - check for corrupted balance
      const corruptedBalance = await instance.balances(owner.address);
      // The balance should have wrapped around to a very small number (0 or near 0)
      expect(corruptedBalance).to.be.lessThan(ethers.parseEther("1"));

      // Try to collect - this should fail in original but might succeed in mutant
      await expect(
        instance.connect(owner).Collect(balanceAfterDeposit)
      ).to.be.reverted;
    } catch (error: any) {
      // If revert occurs, original behavior is preserved
      expect(error.message).to.include("revert");
    }
  });
});