import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter mutant test - m0b6a5874", function () {
  it("should allow DAO to call assertGovernanceApproved without being in governed mapping", async function () {
    const [owner, dao, addr1] = await ethers.getSigners();
    
    // Deploy a mock ERC20 for the flash governance asset
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockToken = await MockERC20.deploy("Mock", "MCK", 18);
    await mockToken.waitForDeployment();
    
    // Deploy FlashGovernanceArbiter with dao as the DAO address
    const Factory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const instance = await Factory.deploy(dao.address);
    await instance.waitForDeployment();
    
    // Transfer tokens to dao for the governance deposit
    await mockToken.transfer(dao.address, ethers.parseEther("1000"));
    
    // The DAO should be able to call assertGovernanceApproved even if not in governed mapping
    // This should work on original but fail on mutant
    
    // First we need to configure flash governance via a successful proposal
    // Since the DAO can make proposals, we'll simulate this by calling configureFlashGovernance from DAO
    // but it requires onlySuccessfulProposal modifier, so we need to set up the DAO properly
    
    // For the test to work, we need to first set up the flash governance config
    // We'll use the owner as a successful proposer by setting up the DAO's proposal config
    // For simplicity, let's directly configure via a successful proposal approach
    
    // Let's deploy a mock DAO-like contract that returns true for successfulProposal
    // Or we can simply call configureFlashGovernance from owner address
    
    // For the purpose of this test, we'll call configureFlashGovernance from owner
    // and then set the DAO address to dao
    const unlockTime = 3600; // 1 hour
    const amount = ethers.parseEther("100");
    
    // Configure flash governance settings (this will work because owner can be a successful proposer)
    await instance.connect(owner).configureFlashGovernance(
      mockToken.target,
      amount,
      unlockTime,
      false
    );
    
    // Approve the FlashGovernanceArbiter to spend tokens from dao
    await mockToken.connect(dao).approve(instance.target, amount);
    
    // Call assertGovernanceApproved from DAO address
    await expect(
      instance.connect(dao).assertGovernanceApproved(
        dao.address,
        instance.target,
        false
      )
    ).to.not.be.reverted;
    
    // Verify the pending flash decision was created
    const pendingDecision = await instance.pendingFlashDecision(
      instance.target,
      dao.address
    );
    expect(pendingDecision.amount).to.equal(amount);
  });
});