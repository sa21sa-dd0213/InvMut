import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant test - finishDistribution return value", function () {
  it("should return true when finishDistribution is called by owner", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Call finishDistribution and check that it returns true
    const tx = await instance.connect(owner).finishDistribution();
    const receipt = await tx.wait();
    
    // Get the return value from the transaction
    const result = await instance.finishDistribution.staticCall();
    
    // The mutant returns false (default bool) instead of true
    expect(result).to.equal(true);
  });
});