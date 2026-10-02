import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("FlashGovernanceArbiter mutant m71ace190 test", function () {
  it("should revert when calling assertGovernanceApproved in non-emergency before epoch elapses", async function () {
    const [owner, dao, governedAddress, user] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for flash governance asset
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    const mockAsset = await ERC20Factory.deploy("Test", "TST", ethers.parseEther("1000000"));
    await mockAsset.waitForDeployment();
    
    // Deploy the FlashGovernanceArbiter with DAO address
    const Factory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const arbiter = await Factory.deploy(dao.address);
    await arbiter.waitForDeployment();
    
    // Configure DAO - we need to set up a mock LimboDAO to make assertSuccessfulProposal pass
    // Since the test needs the DAO to be configured properly, we'll deploy a minimal mock
    const MockDAOFactory = await ethers.getContractFactory("MockLimboDAO");
    const mockDAO = await MockDAOFactory.deploy();
    await mockDAO.waitForDeployment();
    
    // Set DAO in the arbiter
    await arbiter.connect(owner).setDAO(mockDAO.target);
    
    // Configure flash governance parameters via onlySuccessfulProposal - we need to bypass this
    // For testing the specific mutation, we'll directly set the state
    // First, let's set governed[arbiter] = true so flashEnabled passes
    // We need to make the DAO's successfulProposal return true for our calls
    await mockDAO.setSuccessfulProposal(true);
    
    // Configure flash governance
    await arbiter.connect(owner).configureFlashGovernance(
      mockAsset.target,
      ethers.parseEther("100"),
      3600, // 1 hour unlock time
      false
    );
    
    // Configure security parameters with a reasonable epoch size
    await arbiter.connect(owner).configureSecurityParameters(
      10, // maxGovernanceChangePerEpoch
      86400, // epochSize = 1 day
      5 // changeTolerance
    );
    
    // Make arbiter governed so flashEnabled passes
    await arbiter.connect(owner).setGoverned(
      [arbiter.target],
      [true]
    );
    
    // Transfer tokens to user for flash governance
    await mockAsset.transfer(user.address, ethers.parseEther("1000"));
    await mockAsset.connect(user).approve(arbiter.target, ethers.parseEther("1000"));
    
    // First call - this should succeed and set lastFlashGovernanceAct
    await arbiter.connect(user).assertGovernanceApproved(
      user.address,
      arbiter.target,
      false // emergency = false
    );
    
    // Immediately call again (before epoch elapses) - this should revert in original
    // because block.timestamp - lastFlashGovernanceAct is not > epochSize
    await expect(
      arbiter.connect(user).assertGovernanceApproved(
        user.address,
        arbiter.target,
        false // emergency = false
      )
    ).to.be.revertedWith("LIMBO: flash governance disabled for rest of epoch");
    
    // If the test passes (reverts), the mutant is killed because the mutant would NOT revert here
  });
});