import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant test - mfa50f616", function () {
  it("should detect mutant by reverting when adding positive value with <= instead of >=", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get initial balance
    const initialBalance = await instance.getBalance(owner.address);

    // Attempt to add 1 wei - should succeed on original but fail on mutant
    const tx = instance.addToBalance({ value: 1 });
    
    // On the original contract, this succeeds. On the mutant with <=, it reverts
    // because (0 + 1) <= 0 is false
    await expect(tx).to.be.reverted;
  });
});