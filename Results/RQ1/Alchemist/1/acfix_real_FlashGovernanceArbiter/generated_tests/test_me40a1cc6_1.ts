import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("FlashGovernanceArbiter - kill mutant me40a1cc6", function () {
  it("should revert when performing non-emergency flash governance twice in same epoch", async function () {
    const [owner, dao, user, target] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for flash governance asset
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockToken = await MockERC20.deploy("Test", "TST", 18);
    await mockToken.waitForDeployment();
    
    // Deploy a mock LimboDAO
    const MockLimboDAO = await ethers.getContractFactory("MockLimboDAO");
    const mockDAO = await MockLimboDAO.deploy();
    await mockDAO.waitForDeployment();
    
    // Deploy FlashGovernanceArbiter with DAO address
    const FlashGovernanceArbiter = await ethers.getContractFactory("FlashGovernanceArbiter");
    const arbiter = await FlashGovernanceArbiter.deploy(await mockDAO.getAddress());
    await arbiter.waitForDeployment();
    
    // Set up the DAO relationship and configure flash governance
    await arbiter.setDAO(await mockDAO.getAddress());
    
    // Configure flash governance parameters
    const amount = ethers.parseEther("100");
    const unlockTime = 3600; // 1 hour
    await arbiter.connect(dao).configureFlashGovernance(
      await mockToken.getAddress(),
      amount,
      unlockTime,
      false
    );
    
    // Configure security parameters - set epoch size to 1 hour
    await arbiter.connect(dao).configureSecurityParameters(
      50, // maxGovernanceChangePerEpoch
      3600, // epochSize (1 hour)
      10 // changeTolerance
    );
    
    // Set user as governed address
    await arbiter.connect(dao).setGoverned(
      [await user.getAddress()],
      [true]
    );
    
    // Mint tokens to user and approve arbiter
    await mockToken.mint(await user.getAddress(), amount * 2n);
    await mockToken.connect(user).approve(await arbiter.getAddress(), amount * 2n);
    
    // Set DAO to return successfulProposal = true for user
    await mockDAO.setSuccessfulProposal(await user.getAddress(), true);
    
    // Perform first non-emergency flash governance (should succeed)
    await arbiter.connect(user).assertGovernanceApproved(
      await user.getAddress(),
      await target.getAddress(),
      false // non-emergency
    );
    
    // Immediately attempt second non-emergency flash governance within same epoch
    // This should revert because we haven't waited for epoch to pass
    await expect(
      arbiter.connect(user).assertGovernanceApproved(
        await user.getAddress(),
        await target.getAddress(),
        false // non-emergency
      )
    ).to.be.revertedWith("LIMBO: flash governance disabled for rest of epoch");
  });
});