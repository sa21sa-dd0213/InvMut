import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyContract mutant m1c38a07e", function () {
  it("should revert when calling sendTo with a positive amount due to mutant condition amount < 0", async function () {
    const [owner, receiver] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MyContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const positiveAmount = ethers.parseEther("1");
    
    // The original contract allows this, but the mutant requires amount < 0
    // Since uint cannot be negative, the mutant's require will always revert
    await expect(
      instance.connect(owner).sendTo(receiver.address, positiveAmount)
    ).to.be.reverted;
  });
});