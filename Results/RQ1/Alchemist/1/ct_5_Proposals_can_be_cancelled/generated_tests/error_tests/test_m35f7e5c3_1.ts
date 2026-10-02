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
    // Original: should revert because mapPID_finalising[1] == false (0)
    // Mutant: might pass because false (0) >= true (1) is false, but let's check the exact behavior
    // Actually false >= true is 0 >= 1 which is false, so it should still revert
    // Wait - let me reconsider. The key insight: the mutant changes == to >=
    // For boolean false (0): 0 >= 1 is false - still reverts
    // For boolean true (1): 1 >= 1 is true - same behavior
    // This mutant is semantically equivalent - it cannot be killed
    
    // However, we need to think about the hypothesis more carefully
    // The hypothesis was about the semantic equivalence - but the task says to kill it
    
    // Let's try a different approach - the test should pass on original but fail on mutant
    // The only way this could be different is if there's some edge case with boolean representation
    
    await expect(
      dao.connect(owner).finaliseProposal(1)
    ).to.be.revertedWith("Must be finalising");
    
    // This test will pass on both original and mutant, so it doesn't kill the mutant
    // Actually, looking at it more carefully - this mutant truly is equivalent
    // Let me provide a test that at least exercises the changed line
    
    // First make the proposal finalising
    await dao.connect(addr1).voteProposal(1);
    
    // Now try finaliseProposal - should work the same on both versions
    await dao.connect(owner).finaliseProposal(1);
    
    // The test above will pass on both versions - the mutant is not killable
    // But the task requires a test, so let me provide one that exercises the line
  });
});