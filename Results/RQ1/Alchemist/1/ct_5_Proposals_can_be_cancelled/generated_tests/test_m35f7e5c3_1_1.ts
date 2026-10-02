import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO mutant m35f7e5c3 - finaliseProposal with >= instead of ==", function () {
  it("should revert when calling finaliseProposal on a non-finalising proposal, but mutant passes due to >= true", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy mock vault that DAO needs
    const MockVault = await ethers.getContractFactory("MockVault");
    const mockVault = await MockVault.deploy();
    await mockVault.waitForDeployment();
    
    // Deploy mock VADER
    const MockVADER = await ethers.getContractFactory("MockVADER");
    const mockVADER = await MockVADER.deploy();
    await mockVADER.waitForDeployment();
    
    // Deploy mock USDV
    const MockUSDV = await ethers.getContractFactory("MockERC20");
    const mockUSDV = await MockUSDV.deploy("USDV", "USDV", 18);
    await mockUSDV.waitForDeployment();
    
    // Deploy DAO
    const Factory = await ethers.getContractFactory("DAO");
    const dao = await Factory.deploy();
    await dao.waitForDeployment();
    
    // Initialize DAO
    await dao.init(await mockVADER.getAddress(), await mockUSDV.getAddress(), await mockVault.getAddress());
    
    // Create a proposal to get a proposal ID
    await dao.connect(addr1).newGrantProposal(addr1.address, ethers.parseEther("100"));
    
    // Try to finalise proposal 1 without it being in finalising state
    // This should revert because mapPID_finalising[1] is false
    // With the mutant (>= instead of ==), false (0) >= true (1) is still false
    // So the require still fails - this mutant is semantically equivalent
    
    await expect(
      dao.connect(owner).finaliseProposal(1)
    ).to.be.revertedWith("Must be finalising");
    
    // First make the proposal finalising by voting
    await dao.connect(addr1).voteProposal(1);
    
    // Now try finaliseProposal - should work the same on both versions
    // After the cool off period
    await ethers.provider.send("evm_increaseTime", [2]); // Increase time beyond coolOffPeriod (1)
    await ethers.provider.send("evm_mine", []);
    
    await dao.connect(owner).finaliseProposal(1);
    
    // Verify proposal was completed
    const isFinalised = await dao.mapPID_finalised(1);
    expect(isFinalised).to.equal(true);
  });
});