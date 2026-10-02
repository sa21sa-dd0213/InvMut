import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter - kill mutant mcd1ebb04", function () {
  it("should revert when v2 is much larger than v1 in enforceTolerance (mutant changes subtraction to division)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy a mock DAO contract that implements the required interface
    const MockDAOfactory = await ethers.getContractFactory("contracts/mocks/MockLimboDAO.sol:MockLimboDAO");
    const mockDAO = await MockDAOfactory.deploy();
    await mockDAO.waitForDeployment();
    
    // Deploy FlashGovernanceArbiter with the mock DAO
    const Factory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const instance = await Factory.deploy(await mockDAO.getAddress());
    await instance.waitForDeployment();
    
    // Configure the contract with security parameters
    // Set changeTolerance to 10 (10%)
    await mockDAO.setSuccessfulProposal(owner.address, true);
    await instance.connect(owner).configureSecurityParameters(10, 100, 10);
    
    // Configure the contract as configured
    await instance.connect(owner).endConfiguration();
    
    // Enable enforcement for addr1
    await instance.connect(addr1).setEnforcement(true);
    
    // Set addr1 as governed so it can call enforceTolerance
    await instance.connect(owner).setGoverned([addr1.address], [true]);
    
    // Test case: v2 = 300, v1 = 100 (v2 is 3x v1, exceeds 10% tolerance)
    // Original: require(((300 - 100) * 100) < 10 * 100) -> require(20000 < 1000) -> revert
    // Mutant: require(((300 / 100) * 100) < 10 * 100) -> require(300 < 1000) -> passes (wrongly)
    await expect(
      instance.connect(addr1).enforceTolerance(100, 300)
    ).to.be.revertedWith("FE1");
  });
});