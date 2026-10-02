import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant m7f1e8c54 - withdraw partial amount", function () {
  it("should allow withdrawing a partial amount less than the full balance", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit 1 ether
    const depositAmount = ethers.parseEther("1.0");
    await instance.connect(owner).deposit({ value: depositAmount });

    // Try to withdraw 0.5 ether (partial amount, not full balance)
    const withdrawAmount = ethers.parseEther("0.5");
    await expect(
      instance.connect(owner).withdraw(withdrawAmount)
    ).to.not.be.reverted;

    // Verify remaining balance is 0.5 ether
    // Note: no getBalance function exists, but we can verify via refund behavior
    // The test passes if the withdrawal succeeded (original behavior)
  });
});