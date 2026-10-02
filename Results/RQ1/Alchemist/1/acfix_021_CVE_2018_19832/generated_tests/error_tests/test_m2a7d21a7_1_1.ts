import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia mutant m2a7d21a7 test", function () {
  it("should return true when finishDistribution is called successfully by the owner", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Call finishDistribution and check that it returns true
    const tx = await instance.finishDistribution();
    const receipt = await tx.wait();

    // Get the return value from the transaction
    const result = await instance.finishDistribution.staticCall();

    // The original contract returns true, the mutant returns false
    expect(result).to.equal(true);
  });
});