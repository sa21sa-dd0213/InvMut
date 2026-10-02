import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort mutant test - m44692e9d", function () {
  it("should kill mutant by passing non-empty _tos array (original passes, mutant reverts)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy airPort (no constructor arguments)
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Create a non-empty _tos array with one address
    const recipients = [addr2.address];
    
    // On original contract this succeeds, on mutant it reverts because require(_tos.length < 0) fails for any non-zero length
    await expect(
      instance.transfer(owner.address, addr1.address, recipients, 100)
    ).to.be.reverted;
  });
});