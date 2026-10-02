import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort mutant test - m44692e9d", function () {
  it("should revert when _tos array has length > 0 because mutant uses < 0", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed for airPort)
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Create a non-empty _tos array with one recipient
    const recipients = [addr1.address];
    const amount = ethers.parseEther("1.0");
    
    // The mutant changes require(_tos.length > 0) to require(_tos.length < 0)
    // Since array length is always >= 0, the mutant will always revert
    // Original would succeed with non-empty array, but mutant fails
    await expect(
      instance.transfer(owner.address, addr2.address, recipients, amount)
    ).to.be.reverted;
  });
});