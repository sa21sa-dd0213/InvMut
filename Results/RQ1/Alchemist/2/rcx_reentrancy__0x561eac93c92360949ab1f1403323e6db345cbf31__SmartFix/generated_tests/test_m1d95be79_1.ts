import { expect } from "chai";
import { ethers } } from "hardhat";

describe("BANK_SAFE mutant kill test - Deposit with zero value", function () {
  it("should kill mutant m1d95be79 by depositing zero wei", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("BANK_SAFE");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit 0 wei - should succeed on original, revert on mutant
    const tx = await instance.connect(owner).Deposit({ value: 0 });
    await expect(tx).to.not.be.reverted;

    // Verify balance is still 0 (no change from zero deposit)
    const balance = await instance.balances(owner.address);
    expect(balance).to.equal(0);
  });
});