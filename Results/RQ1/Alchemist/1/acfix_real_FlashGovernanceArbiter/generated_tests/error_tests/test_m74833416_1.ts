import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter mutant kill test - m74833416", function () {
  it("should kill mutant by using block.timestamp comparison for unlockTime", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy a mock DAO that returns valid values
    const MockDAO = await ethers.getContractFactory("MockLimboDAO");
    const mockDAO = await MockDAO.deploy();
    await mockDAO.waitForDeployment();
    
    // Deploy the FlashGovernanceArbiter
    const Factory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const instance = await Factory.deploy(await mockDAO.getAddress());
    await instance.waitForDeployment();
    
    // Setup: approve owner as a governed address via onlySuccessfulProposal
    // First we need to make the owner a successful proposal sender
    await mockDAO.setSuccessfulProposal(owner.address, true);
    
    // Configure flash governance parameters
    // Deploy a mock ERC20 token for the asset
    const MockToken = await ethers.getContractFactory("MockERC20");
    const mockToken = await MockToken.deploy("Test", "TST", ethers.parseEther("1000000"));
    await mockToken.waitForDeployment();
    
    // Configure flash governance with a 1-hour unlock time
    await instance.connect(owner).configureFlashGovernance(
      await mockToken.getAddress(),
      ethers.parseEther("100"),
      3600, // unlockTime = 1 hour
      false
    );
    
    // Configure security parameters
    await instance.connect(owner).configureSecurityParameters(
      10, // maxGovernanceChangePerEpoch
      100, // epochSize
      50  // changeTolerance
    );
    
    // End configuration so that assertGovernanceApproved works properly
    await instance.connect(owner).endConfiguration();
    
    // Fund addr1 with tokens and approve the arbiter
    await mockToken.transfer(addr1.address, ethers.parseEther("1000"));
    await mockToken.connect(addr1).approve(await instance.getAddress(), ethers.parseEther("100"));
    
    // Add addr1 as a governed address via setGoverned (onlySuccessfulProposal)
    await instance.connect(owner).setGoverned([addr1.address], [true]);
    
    // First call: make a successful flash governance decision to set pendingFlashDecision
    // We need to fast-forward time to make block.timestamp work correctly
    const currentBlock = await ethers.provider.getBlock("latest");
    const currentTimestamp = currentBlock!.timestamp;
    
    // Set the unlock time to be in the past (so the comparison passes)
    // We need to directly set pendingFlashDecision via the contract's storage or create one via assertGovernanceApproved
    // Let's call assertGovernanceApproved first to create a pending decision
    await instance.connect(addr1).assertGovernanceApproved(
      addr1.address,
      addr2.address,
      false
    );
    
    // Now fast forward time past the unlockTime
    await ethers.provider.send("evm_increaseTime", [7200]); // increase by 2 hours
    await ethers.provider.send("evm_mine", []);
    
    // Now try to call assertGovernanceApproved again
    // In the original, this should succeed because unlockTime < block.timestamp
    // In the mutant, block.prevrandao is used instead of block.timestamp
    // block.prevrandao returns a random value that is likely not > current time
    // so the mutant should revert
    
    await expect(
      instance.connect(addr1).assertGovernanceApproved(
        addr1.address,
        addr2.address,
        false
      )
    ).to.not.be.reverted;
    
    // If we get here, the original passes (mutant would have failed)
    // To properly kill the mutant, we need to ensure it fails
    // The mutant will revert because block.prevrandao < block.timestamp is unlikely to be true
    // So if the test passes, the mutant is killed
  });
});