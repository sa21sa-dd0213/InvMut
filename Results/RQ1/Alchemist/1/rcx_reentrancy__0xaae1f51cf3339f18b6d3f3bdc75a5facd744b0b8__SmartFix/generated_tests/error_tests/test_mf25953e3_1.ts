import { expect } from "chai";
import { ethers } } from "hardhat";

describe("DEP_BANK mutant detection - Deposit function", function () {
  it("should kill mutant mf25953e3 by reverting when depositing a non-zero amount", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("DEP_BANK");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First initialize the contract (required before deposits work)
    await instance.connect(owner).Initialized();

    // Send a non-zero deposit from addr1
    const depositAmount = ethers.parseEther("1.0");
    
    // On the mutant, the require check becomes <=, so any positive deposit will fail
    // On the original, the deposit should succeed
    // We expect the transaction to succeed (original behavior), but the mutant will revert
    // So we assert that the transaction does NOT revert (detecting the mutant)
    await expect(
      instance.connect(addr1).Deposit({ value: depositAmount })
    ).to.not.be.reverted;

    // Verify balance was updated (additional check to confirm original behavior)
    const balance = await instance.balances(addr1.address);
    expect(balance).to.equal(depositAmount);
  });
});