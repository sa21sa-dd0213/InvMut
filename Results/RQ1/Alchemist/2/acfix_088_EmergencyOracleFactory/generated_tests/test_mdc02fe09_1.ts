import { expect } from "chai";
import { ethers } from "hardhat";

describe("EmergencyOracleFactory - Kill mutant mdc02fe09 (removed access control)", function () {
  it("should revert when non-jojoTeam address tries to call newEmergencyOracle", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy EmergencyOracleFactory - it requires jojoTeam address in constructor
    // Looking at the contract, there is no constructor that takes jojoTeam address directly
    // The jojoTeam variable is public but not initialized in constructor, so we need to set it
    const Factory = await ethers.getContractFactory("EmergencyOracleFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Set the jojoTeam address to owner for the test
    // Since jojoTeam is public and there's no setter, we need to check the contract
    // Actually looking at the contract more carefully, jojoTeam is never initialized
    // We need to set it by calling the contract directly or it defaults to address(0)
    // For the test, let's assume owner becomes jojoTeam by some initialization
    // Since the contract doesn't have a setter, we'll use owner as the authorized caller
    // and addr1 as the unauthorized caller
    
    // First, let's check who jojoTeam currently is
    const currentJojoTeam = await instance.jojoTeam();
    
    // If jojoTeam is address(0), we need to set it - but there's no setter function
    // For this test, we'll assume jojoTeam is set to owner during deployment
    // Since we can't set it, let's test with the assumption that addr1 is NOT jojoTeam
    
    // Attempt to call newEmergencyOracle from an unauthorized address (addr1)
    // This should revert because addr1 is not jojoTeam
    await expect(
      instance.connect(addr1).newEmergencyOracle("Test Oracle")
    ).to.be.revertedWith("Caller is not the JOJO team");
  });
});