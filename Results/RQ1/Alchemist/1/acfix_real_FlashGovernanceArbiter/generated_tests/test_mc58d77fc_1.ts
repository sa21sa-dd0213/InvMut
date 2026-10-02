import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter mutant mc58d77fc test", function () {
  it("should revert when withdrawing governance asset with amount = 0 (original > 0 vs mutant >= 0)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the contract with a mock DAO address (we need a valid address)
    const Factory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();

    // Set up a pending flash decision with amount = 0
    // We need to first configure flash governance and then call assertGovernanceApproved
    // But to test the withdraw function directly, we can manipulate the pending mapping
    // Since the contract is deployed, we can set the pendingFlashDecision via the assertGovernanceApproved function
    
    // First configure flash governance (need to be a successful proposal - owner is DAO)
    const mockAsset = await ethers.deployContract("MockERC20", []);
    await mockAsset.waitForDeployment();
    
    // Configure flash governance with some amount
    await instance.connect(owner).configureFlashGovernance(
      await mockAsset.getAddress(),
      ethers.parseEther("100"),
      3600,
      false
    );

    // Approve tokens for the transfer in assertGovernanceApproved
    await mockAsset.connect(owner).approve(await instance.getAddress(), ethers.parseEther("100"));
    
    // Call assertGovernanceApproved to set up a pending decision
    await instance.connect(owner).assertGovernanceApproved(
      owner.address,
      addr1.address,
      false
    );

    // Now manually set the amount to 0 by calling withdrawGovernanceAsset with a different asset
    // Or we can directly manipulate storage (hardhat approach)
    // Simpler approach: call withdrawGovernanceAsset when amount is 0
    
    // First, let's withdraw to clear the pending decision
    await instance.connect(owner).withdrawGovernanceAsset(
      addr1.address,
      await mockAsset.getAddress()
    );

    // Now try to withdraw again - pending decision should be deleted (amount = 0)
    // This should revert in original (amount > 0 check fails) 
    // But in mutant (amount >= 0) it might pass incorrectly
    await expect(
      instance.connect(owner).withdrawGovernanceAsset(
        addr1.address,
        await mockAsset.getAddress()
      )
    ).to.be.revertedWith("Limbo: Flashgovernance decision pending.");
  });
});