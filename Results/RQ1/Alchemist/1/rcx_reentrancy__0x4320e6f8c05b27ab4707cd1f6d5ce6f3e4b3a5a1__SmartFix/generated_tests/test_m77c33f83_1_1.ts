import { expect } from "chai";
import { ethers } from "hardhat";

describe("ACCURAL_DEPOSIT - kill mutant m77c33f83 (SetMinSum always reverts)", function () {
  it("should allow SetMinSum before Initialized is called", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ACCURAL_DEPOSIT");
    // No constructor arguments needed for ACCURAL_DEPOSIT
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const newMinSum = ethers.parseEther("2");
    
    // Before Initialized() is called, SetMinSum should succeed on original
    await expect(instance.SetMinSum(newMinSum)).to.not.be.reverted;
    
    // Verify the value was set correctly
    expect(await instance.MinSum()).to.equal(newMinSum);
  });
});