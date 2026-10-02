import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant mc0298dc3 by verifying transferOwnership sets correct owner", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Owned contract (no constructor arguments needed as per the original code)
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Verify initial owner is deployer
    expect(await instance.owner()).to.equal(owner.address);
    
    // Call transferOwnership with a new owner address (addr1)
    const tx = await instance.connect(owner).transferOwnership(addr1.address);
    await tx.wait();
    
    // In the original contract, owner should be addr1
    // In the mutant, owner would incorrectly be set to address(this) (contract address)
    // This assertion will fail on the mutant, killing it
    expect(await instance.owner()).to.equal(addr1.address);
  });
});