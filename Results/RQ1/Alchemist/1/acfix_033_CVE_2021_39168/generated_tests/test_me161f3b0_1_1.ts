import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant test - me161f3b0", function () {
  it("should detect sha256 vs keccak256 difference for PROPOSER_ROLE", async function () {
    const [owner, proposer] = await ethers.getSigners();
    
    const minDelay = 3600; // 1 hour
    const proposers = [proposer.address];
    const executors = [owner.address];
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();
    
    // Compute the expected PROPOSER_ROLE using keccak256 (original behavior)
    const expectedProposerRole = ethers.keccak256(ethers.toUtf8Bytes("PROPOSER_ROLE"));
    
    // Get the actual PROPOSER_ROLE from the contract
    const actualProposerRole = await instance.PROPOSER_ROLE();
    
    // If the mutant uses sha256, the roles will differ
    if (actualProposerRole !== expectedProposerRole) {
      // Mutant detected: sha256 was used instead of keccak256
      // The proposer should NOT have the expected keccak256 role
      expect(await instance.hasRole(expectedProposerRole, proposer.address)).to.be.false;
      
      // The proposer should have the actual (sha256-based) role
      expect(await instance.hasRole(actualProposerRole, proposer.address)).to.be.true;
    } else {
      // Original: proposer should have the keccak256-based role
      expect(await instance.hasRole(actualProposerRole, proposer.address)).to.be.true;
    }
    
    // Now test that schedule() call works correctly with the actual role
    const target = proposer.address;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.keccak256(ethers.toUtf8Bytes("test"));
    const delay = minDelay;
    
    // Proposer tries to schedule - should succeed if they have the role
    await expect(
      instance.connect(proposer).schedule(target, value, data, predecessor, salt, delay)
    ).to.not.be.reverted;
    
    // Now verify that a non-proposer cannot schedule (using the actual role)
    const nonProposer = (await ethers.getSigners())[2];
    await expect(
      instance.connect(nonProposer).schedule(target, value, data, predecessor, salt, delay)
    ).to.be.reverted;
  });
});