import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter - mutant detection for setGoverned", function () {
  it("should revert when governables array is longer than isGoverned array", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy a mock DAO contract that implements the required interface
    const MockDAODef = await ethers.getContractFactory("LimboDAOLike");
    const mockDAO = await MockDAODef.deploy();
    await mockDAO.waitForDeployment();
    
    const Factory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const instance = await Factory.deploy(await mockDAO.getAddress());
    await instance.waitForDeployment();
    
    // Setup: configure DAO to make owner a successful proposal
    await mockDAO.setApprovedAsset(ethers.ZeroAddress, true, false, 0);
    
    // Create arrays with different lengths - governables longer than isGoverned
    const governables = [addr1.address, addr2.address]; // 2 addresses
    const isGoverned = [true]; // only 1 boolean
    
    // This should revert because lengths don't match exactly
    await expect(
      instance.connect(owner).setGoverned(governables, isGoverned)
    ).to.be.revertedWith("LIMBO: length mismatch");
  });
});