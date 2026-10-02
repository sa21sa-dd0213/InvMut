import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant kill test - mb380d662", function () {
  it("should kill mutant by verifying setOwner assigns the correct new owner address", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy Owned (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Verify initial owner is deployer
    expect(await instance.owner()).to.equal(owner.address);
    
    // Call setOwner with a new address (addr1)
    const tx = await instance.connect(owner).setOwner(addr1.address);
    await tx.wait();
    
    // Assert that owner is now addr1 - this will fail on mutant where owner becomes contract address
    expect(await instance.owner()).to.equal(addr1.address);
  });
});