import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant mfa50f616", function () {
  it("should revert when depositing a positive amount due to mutated <= check", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const depositAmount = ethers.parseEther("1");
    
    // The mutant requires: (userBalance[msg.sender] + msg.value) <= userBalance[msg.sender]
    // This is only true when msg.value == 0 (or if userBalance overflows, which is impractical)
    // Any positive deposit should revert
    await expect(
      instance.addToBalance({ value: depositAmount })
    ).to.be.reverted;
  });
});