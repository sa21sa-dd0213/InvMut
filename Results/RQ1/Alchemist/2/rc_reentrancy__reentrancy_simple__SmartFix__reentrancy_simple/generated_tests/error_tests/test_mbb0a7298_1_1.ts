import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant mbb0a7298 detection", function () {
  it("should detect mutant by calling addToBalance with zero value", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get initial balance for owner (should be 0)
    const initialBalance = await instance.getBalance(owner.address);
    expect(initialBalance).to.equal(0);

    // Attempt to add zero ether - should succeed on original, fail on mutant
    const tx = instance.connect(owner).addToBalance({ value: 0 });

    // The mutant will revert because 0 > 0 is false
    // The original will succeed because 0 >= 0 is true
    await expect(tx).to.be.reverted;
  });
});