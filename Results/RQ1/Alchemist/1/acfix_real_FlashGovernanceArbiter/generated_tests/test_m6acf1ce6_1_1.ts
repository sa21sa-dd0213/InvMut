import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter - kill mutant m6acf1ce6", function () {
  it("should revert when assertGovernanceApproved is called without depositing flash governance asset", async function () {
    const [owner, dao, sender, target] = await ethers.getSigners();

    // Deploy a mock ERC20 token for the flash governance asset
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockAsset = await MockERC20.deploy("FlashAsset", "FLA", ethers.parseEther("1000000"));
    await mockAsset.waitForDeployment();

    // Deploy FlashGovernanceArbiter with DAO address
    const FlashGovernanceArbiter = await ethers.getContractFactory("FlashGovernanceArbiter");
    const arbiter = await FlashGovernanceArbiter.deploy(dao.address);
    await arbiter.waitForDeployment();

    // Configure flash governance parameters via DAO (which is the owner for this test)
    // First, we need to make the DAO address a successful proposal sender
    // For simplicity, we'll configure the DAO address as governed
    await arbiter.connect(dao).setGoverned([dao.address], [true]);

    // Configure flash governance settings - set asset, amount, unlockTime, assetBurnable
    await arbiter.connect(dao).configureFlashGovernance(
      mockAsset.target,
      ethers.parseEther("100"),
      3600, // unlockTime
      false // assetBurnable
    );

    // Configure security parameters
    await arbiter.connect(dao).configureSecurityParameters(
      10, // maxGovernanceChangePerEpoch
      86400, // epochSize
      50 // changeTolerance
    );

    // Attempt to call assertGovernanceApproved from sender without depositing any tokens
    // The original contract requires transferFrom to succeed - sender hasn't approved tokens
    await expect(
      arbiter.connect(sender).assertGovernanceApproved(
        sender.address,
        target.address,
        false // emergency
      )
    ).to.be.revertedWith("LIMBO: governance decision rejected.");

    // Now approve and transfer tokens to show the call would work with proper setup
    await mockAsset.connect(sender).approve(arbiter.target, ethers.parseEther("100"));

    // With proper approval, the call should succeed
    await expect(
      arbiter.connect(sender).assertGovernanceApproved(
        sender.address,
        target.address,
        false // emergency
      )
    ).to.emit(arbiter, "flashDecision");
  });
});