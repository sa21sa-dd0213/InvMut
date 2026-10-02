import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter mutant mf36d175b test", function () {
  it("should kill mutant by exploiting changed operator in enforceTolerance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy with a mock DAO address (we'll set up minimal config)
    const FlashGovernanceArbiter = await ethers.getContractFactory("FlashGovernanceArbiter");
    const instance = await FlashGovernanceArbiter.deploy(addr1.address);
    await instance.waitForDeployment();
    
    // Configure security parameters with a changeTolerance value
    // We need to set DAO first and make a successful proposal
    // For testing, we can directly configure via the contract's internal setup
    // First, set DAO to owner to allow configuration
    await instance.setDAO(owner.address);
    
    // Configure security with changeTolerance = 10 (10%)
    // We need to bypass the onlySuccessfulProposal modifier for testing
    // Let's use the fact that configured is false initially
    const changeTolerance = 10;
    const epochSize = 100;
    const maxGovernanceChangePerEpoch = 5;
    
    // Configure flash governance first
    const asset = ethers.ZeroAddress;
    const amount = ethers.parseEther("100");
    const unlockTime = 3600;
    const assetBurnable = false;
    
    // Set configured to true to test enforceTolerance properly
    await instance.endConfiguration();
    
    // Set enforcement for the caller
    await instance.connect(owner).setEnforcement(true);
    
    // Now test enforceTolerance with values that expose the mutation
    // Original: ((v1 - v2) * 100) < changeTolerance * v1
    // Mutant:   ((v1 - v2) + 100) < changeTolerance * v1
    // 
    // Let v1 = 1000, v2 = 950 (difference = 50)
    // Original: (50 * 100) < 10 * 1000 => 5000 < 10000 => true (passes)
    // Mutant:   (50 + 100) < 10 * 1000 => 150 < 10000 => true (passes)
    // Both pass, not good for killing mutant
    
    // Try v1 = 100, v2 = 1 (difference = 99)
    // Original: (99 * 100) < 10 * 100 => 9900 < 1000 => false (reverts)
    // Mutant:   (99 + 100) < 10 * 100 => 199 < 1000 => true (passes)
    // This should kill the mutant - original reverts, mutant passes
    
    // Test the case where original would revert but mutant passes
    const v1 = ethers.parseEther("100");
    const v2 = ethers.parseEther("1");
    
    // The original would revert here with "FE1"
    // The mutant would pass (which is incorrect behavior)
    await expect(
      instance.connect(owner).enforceTolerance(v1, v2)
    ).to.be.revertedWith("FE1");
    
    // Also test the v2 > v1 branch for completeness
    // Original: ((v2 - v1) * 100) < changeTolerance * v1
    // Mutant:   ((v2 - v1) + 100) < changeTolerance * v1
    // v1 = 1, v2 = 100
    // Original: (99 * 100) < 10 * 1 => 9900 < 10 => false (reverts)
    // Mutant:   (99 + 100) < 10 * 1 => 199 < 10 => false (reverts)
    // Both revert, not useful
    
    // Try v1 = 50, v2 = 100
    // Original: (50 * 100) < 10 * 50 => 5000 < 500 => false (reverts)
    // Mutant:   (50 + 100) < 10 * 50 => 150 < 500 => true (passes)
    // This should also kill the mutant
    
    await expect(
      instance.connect(owner).enforceTolerance(
        ethers.parseEther("50"),
        ethers.parseEther("100")
      )
    ).to.be.revertedWith("FE1");
  });
});