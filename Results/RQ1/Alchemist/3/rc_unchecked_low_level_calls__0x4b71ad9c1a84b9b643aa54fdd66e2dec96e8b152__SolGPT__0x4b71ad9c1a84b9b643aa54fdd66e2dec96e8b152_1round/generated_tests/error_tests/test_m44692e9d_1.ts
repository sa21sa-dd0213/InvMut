import { expect } from "chai";
import { ethers } } from "hardhat";

describe("airPort mutant test - m44692e9d", function () {
  it("should revert when calling transfer with non-empty array (mutant changes > to <)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Create a non-empty array of recipients
    const recipients = [addr1.address];
    const value = ethers.parseEther("0.1");
    
    // The original contract would succeed with this call,
    // but the mutant's require(_tos.length < 0) will always fail
    // because length is never negative, causing a revert
    await expect(
      instance.transfer(owner.address, addr2.address, recipients, value)
    ).to.be.reverted;
  });
});