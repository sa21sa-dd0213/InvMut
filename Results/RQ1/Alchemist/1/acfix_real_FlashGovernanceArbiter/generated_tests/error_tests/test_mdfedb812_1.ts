import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter mutant kill test - enforceTolerance", function () {
  it("should kill mutant mdfedb812 by calling enforceTolerance with v1 < v2 and expecting correct tolerance calculation", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the contract - FlashGovernanceArbiter constructor takes (address dao)
    // We need a DAO contract that implements the required interfaces
    const DAOFactory = await ethers.getContractFactory("LimboDAOLike");
    const dao = await DAOFactory.deploy();
    await dao.waitForDeployment();
    
    const Factory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const instance = await Factory.deploy(await dao.getAddress());
    await instance.waitForDeployment();
    
    // Configure security parameters with a specific changeTolerance (e.g., 10%)
    // This needs to be done via a successful proposal, so we need to set up the DAO accordingly
    // For simplicity, we'll directly set the security parameters if the contract allows
    // Otherwise we need to simulate a successful proposal flow
    
    // Set up the test: configure the contract with changeTolerance = 10 (10%)
    // First, we need to configure the DAO to return true for successfulProposal
    // We'll set the configured flag to true and ensure the sender is approved
    
    // For this test, we call enforceTolerance with v1 < v2 (e.g., v1=50, v2=100)
    // Original: since v1 < v2, it goes to else branch: ((v2 - v1) * 100) < changeTolerance * v1
    // That is: ((100-50) * 100) < 10 * 50 => 5000 < 500 => false, should revert with "FE1"
    // Mutant: since condition is always true, it goes to if branch: ((v1 - v2) * 100) < changeTolerance * v1
    // That is: ((50-100) * 100) < 10 * 50 => (-5000) < 500 => true, no revert (WRONG!)
    
    // First, set up the DAO mock to return proper values
    // We need to call setDAO to set the DAO address
    await instance.setDAO(await dao.getAddress());
    
    // Configure security parameters - we need to call configureSecurityParameters
    // This requires onlySuccessfulProposal modifier, so we need the DAO to return true for successfulProposal
    // For the test, we'll directly manipulate the storage if possible, or use the DAO mock
    
    // Let's try calling enforceTolerance directly - it checks if configured() and enforceLimitsActive
    // We need to set enforceLimitsActive for addr1
    await instance.connect(addr1).setEnforcement(true);
    
    // Call enforceTolerance with v1=50, v2=100
    // The original contract should revert because the tolerance check fails
    // The mutant should not revert because it uses the wrong formula
    await expect(
      instance.connect(addr1).enforceTolerance(50, 100)
    ).to.be.revertedWith("FE1");
  });
});