import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("FlashGovernanceArbiter - kill mutant ma52a1aea", function () {
  it("should detect mutant that replaces block.timestamp with block.prevrandao in lastFlashGovernanceAct assignment", async function () {
    const [owner, dao, governedAddr, user] = await ethers.getSigners();
    
    // Deploy with DAO address
    const FlashGovernanceArbiter = await ethers.getContractFactory("FlashGovernanceArbiter");
    const arbiter = await FlashGovernanceArbiter.deploy(dao.address);
    await arbiter.waitForDeployment();
    
    // Setup: configure flash governance parameters
    // First need to make the sender a successful proposal (we'll use DAO as it can call onlySuccessfulProposal functions)
    // For testing purposes, we'll configure the contract as if it's already configured via DAO
    
    // Set governed address to allow assertGovernanceApproved calls
    await arbiter.connect(dao).setGoverned([governedAddr.address], [true]);
    
    // Configure flash governance with a test asset (we'll use a simple ERC20 mock)
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockToken = await MockERC20.deploy("Test", "TST", ethers.parseEther("1000"));
    await mockToken.waitForDeployment();
    
    // Transfer tokens to user for testing
    await mockToken.transfer(user.address, ethers.parseEther("100"));
    
    // Configure flash governance parameters via DAO (which is a successful proposer)
    const unlockTime = 3600; // 1 hour
    await arbiter.connect(dao).configureFlashGovernance(
      await mockToken.getAddress(),
      ethers.parseEther("10"),
      unlockTime,
      false
    );
    
    // Configure security parameters
    await arbiter.connect(dao).configureSecurityParameters(
      10, // maxGovernanceChangePerEpoch
      86400, // epochSize = 1 day
      5 // changeTolerance
    );
    
    // Set enforcement for governed address
    await arbiter.connect(governedAddr).setEnforcement(true);
    
    // User approves tokens for transfer by arbiter
    await mockToken.connect(user).approve(await arbiter.getAddress(), ethers.parseEther("100"));
    
    // First non-emergency flash governance action
    await arbiter.connect(governedAddr).assertGovernanceApproved(
      user.address,
      await arbiter.getAddress(),
      false
    );
    
    // Wait for epoch to pass (epochSize = 86400 seconds)
    await time.increase(86401);
    
    // Second non-emergency flash governance action - should succeed in original
    // In mutant, block.prevrandao is used instead of block.timestamp,
    // making the time comparison unpredictable and likely causing revert
    await expect(
      arbiter.connect(governedAddr).assertGovernanceApproved(
        user.address,
        await arbiter.getAddress(),
        false
      )
    ).to.not.be.reverted;
  });
});