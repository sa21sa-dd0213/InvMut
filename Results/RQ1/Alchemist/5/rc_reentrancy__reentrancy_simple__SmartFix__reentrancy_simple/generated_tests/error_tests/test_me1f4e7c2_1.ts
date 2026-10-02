import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant kill test - me1f4e7c2", function () {
  it("should succeed when adding non-zero balance (mutant incorrectly reverts)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send 1 ether to addToBalance - should succeed on original, fail on mutant
    const tx = instance.connect(owner).addToBalance({ value: ethers.parseEther("1") });
    
    // The original contract accepts this; the mutant's require will fail
    // because (userBalance - msg.value) >= userBalance is false for non-zero msg.value
    await expect(tx).to.not.be.reverted;
  });
});