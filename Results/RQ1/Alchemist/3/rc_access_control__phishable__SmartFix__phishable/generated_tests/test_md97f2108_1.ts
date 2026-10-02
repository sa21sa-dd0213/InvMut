import { expect } from "chai";
import { ethers } from "hardhat";

describe("Phishable mutant md97f2108 detection", function () {
  it("should detect mutant that sets owner to address(this) instead of constructor argument", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Phishable");
    
    // Deploy with owner as the contract deployer's address
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();
    
    // Verify that owner was set correctly (should be owner.address in original)
    // In mutant, owner would be contract address, so withdrawAll from owner should revert
    await expect(
      instance.connect(owner).withdrawAll(addr1.address)
    ).to.not.be.reverted;
  });
});