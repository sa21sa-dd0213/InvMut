import { expect } from "chai";
import { ethers } } from "hardhat";

describe("SimpleSuicide mutant test (me2d7f7b7)", function () {
  it("should kill mutant by calling sudicideAnyone from owner address and expecting it to succeed", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy SimpleSuicide - note it inherits SmartFix which sets owner in constructor
    const Factory = await ethers.getContractFactory("SimpleSuicide");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Call from owner - original allows this, mutant reverts
    // If mutant is present (require(smartfix_owner != msg.sender)), owner call will revert
    // If original (require(smartfix_owner == msg.sender)), owner call succeeds
    await expect(
      instance.connect(owner).sudicideAnyone()
    ).to.not.be.reverted;
  });
});