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
    
    // Configure flash governance parameters (need to do this via successful proposal)
    // First, configure the DAO to allow owner to make proposals
    // For simplicity, we'll set up the flash governance config directly
    // Note: configureFlashGovernance requires onlySuccessfulProposal modifier
    // We need to bypass this for testing - let's set up the config via direct state manipulation
    // or use the owner as a successful proposer
    
    // Transfer tokens to dao for the governance deposit
    await mockToken.transfer(dao.address, ethers.parseEther("1000"));
    
    // Configure flash governance settings
    const unlockTime = 3600; // 1 hour
    const amount = ethers.parseEther("100");
    
    // The DAO should be able to call assertGovernanceApproved even if not in governed mapping
    // This should work on original but fail on mutant
    
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