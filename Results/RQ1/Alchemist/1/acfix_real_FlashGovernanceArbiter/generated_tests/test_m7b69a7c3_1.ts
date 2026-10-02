import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter - kill mutant m7b69a7c3 (withdrawGovernanceAsset amount < 0)", function () {
  it("should successfully withdraw governance assets after deposit and unlock time passes, but mutant with < will always revert", async function () {
    const [owner, dao, user] = await ethers.getSigners();
    
    // Deploy FlashGovernanceArbiter with DAO address
    const FlashGovernanceArbiter = await ethers.getContractFactory("FlashGovernanceArbiter");
    const arbiter = await FlashGovernanceArbiter.deploy(dao.address);
    await arbiter.waitForDeployment();
    
    // Deploy a mock ERC20 token for testing
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const token = await MockERC20.deploy("Test", "TST", ethers.parseEther("1000"));
    await token.waitForDeployment();
    
    // Set up: configure flash governance parameters via successful proposal
    // First, configure the DAO to make owner a successful proposer
    // For testing, we'll set the DAO to be the arbiter itself (simplification)
    // In real scenario, we'd need a proper DAO setup
    
    // Deploy a minimal DAO mock that returns successful for owner
    const MockDAO = await ethers.getContractFactory("MockLimboDAO");
    const mockDAO = await MockDAO.deploy();
    await mockDAO.waitForDeployment();
    
    // Update DAO in arbiter
    await arbiter.setDAO(await mockDAO.getAddress());
    
    // Configure flash governance (onlySuccessfulProposal - owner will be considered successful)
    const unlockTime = 100; // seconds
    const amount = ethers.parseEther("10");
    await arbiter.configureFlashGovernance(
      await token.getAddress(),
      amount,
      unlockTime,
      false
    );
    
    // Configure security parameters
    await arbiter.configureSecurityParameters(
      50, // maxGovernanceChangePerEpoch
      3600, // epochSize (1 hour)
      10 // changeTolerance (10%)
    );
    
    // Set governed status for user
    await arbiter.setGoverned([user.address], [true]);
    
    // User approves tokens for the arbiter
    await token.connect(user).approve(await arbiter.getAddress(), amount);
    
    // User calls assertGovernanceApproved to deposit tokens and create pending decision
    await arbiter.connect(user).assertGovernanceApproved(
      user.address,
      await arbiter.getAddress(),
      false // emergency = false
    );
    
    // Wait for unlock time to pass
    await ethers.provider.send("evm_increaseTime", [unlockTime + 1]);
    await ethers.provider.send("evm_mine", []);
    
    // Attempt to withdraw - this should succeed on original (amount > 0)
    // On mutant (amount < 0), this will always revert because uint256 cannot be < 0
    await expect(
      arbiter.connect(user).withdrawGovernanceAsset(
        await arbiter.getAddress(),
        await token.getAddress()
      )
    ).to.not.be.reverted;
    
    // Verify user received their tokens back
    const userBalance = await token.balanceOf(user.address);
    expect(userBalance).to.equal(ethers.parseEther("10"));
  });
});