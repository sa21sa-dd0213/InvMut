import { expect } from "chai";
import { ethers } from "hardhat";

describe("Phishable mutant test - md69ea067", function () {
  it("should kill mutant by proving owner is contract address instead of deployer", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy with owner as the first signer
    const Factory = await ethers.getContractFactory("Phishable");
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();
    
    // Verify that owner is NOT the contract address in the original
    // In the mutant, owner will be address(this) which equals instance.target
    const contractOwner = await instance.owner();
    
    // If mutant is alive, contractOwner equals instance.target (contract address)
    // If original, contractOwner equals owner.address
    // Test: owner tries to withdraw - should revert in mutant because msg.sender != owner
    await expect(
      instance.connect(owner).withdrawAll(owner.address)
    ).to.be.reverted;
    
    // Additional verification: attacker should also fail
    await expect(
      instance.connect(attacker).withdrawAll(attacker.address)
    ).to.be.reverted;
  });
});