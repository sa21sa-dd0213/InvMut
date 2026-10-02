import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant test - mbb0a7298", function () {
  it("should kill mutant by calling addToBalance with zero value", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get initial balance for owner
    const initialBalance = await instance.getBalance(owner.address);
    expect(initialBalance).to.equal(0);

    // Call addToBalance with zero msg.value - should succeed on original, revert on mutant
    const tx = instance.connect(owner).addToBalance({ value: 0 });
    
    // The mutant will revert because 0 > 0 is false
    // The original would succeed because 0 >= 0 is true
    await expect(tx).to.be.reverted;
  });
});