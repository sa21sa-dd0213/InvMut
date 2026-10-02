import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter - enforceTolerance mutant kill test", function () {
  it("should kill mutant m9a957b7d by calling enforceTolerance with v1=0 and v2=0", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy a mock DAO that returns required values
    const MockDAOFactory = await ethers.getContractFactory("MockLimboDAO");
    const mockDAO = await MockDAOFactory.deploy();
    await mockDAO.waitForDeployment();
    
    // Deploy FlashGovernanceArbiter with mock DAO address
    const Factory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const instance = await Factory.deploy(await mockDAO.getAddress());
    await instance.waitForDeployment();
    
    // Configure the contract to have enforcement active
    // First, set configured = true by calling endConfiguration
    await instance.endConfiguration();
    
    // Enable enforcement for addr1
    await instance.connect(addr1).setEnforcement(true);
    
    // Now test the enforceTolerance function with v1=0 and v2=0
    // Original: when v1 > v2 (false), goes to else branch, then v1 == 0 (true), checks v2 <= 1 (0 <= 1 = true) - passes
    // Mutant: when v1 > v2 (false), goes to else branch, then v1 == 0 (true), checks v2 != 0 (false) - skips check, proceeds to require(((v2 - v1) * 100) < security.changeTolerance * v1) which divides by zero or calculates incorrectly
    
    // This should revert on the mutant but pass on the original
    await expect(
      instance.connect(addr1).enforceTolerance(0, 0)
    ).to.not.be.reverted;
  });
});