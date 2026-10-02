import { ethers } from "hardhat";
import { expect } from "chai";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { FlashGovernanceArbiter, IERC20 } from "../typechain-types";

describe("FlashGovernanceArbiter", function () {
  let flashGovernanceArbiter: FlashGovernanceArbiter;
  let owner: SignerWithAddress;
  let user: SignerWithAddress;
  let dao: SignerWithAddress;
  let mockToken: IERC20;
  let mockBurnable: any;

  beforeEach(async function () {
    [owner, user, dao] = await ethers.getSigners();

    // Deploy mock ERC20 token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockToken = await MockERC20.deploy("Mock Token", "MTK", 18);
    await mockToken.waitForDeployment();

    // Deploy mock Burnable token
    const MockBurnable = await ethers.getContractFactory("MockBurnable");
    mockBurnable = await MockBurnable.deploy();
    await mockBurnable.waitForDeployment();

    // Deploy FlashGovernanceArbiter
    const FlashGovernanceArbiterFactory = await ethers.getContractFactory("FlashGovernanceArbiter");
    flashGovernanceArbiter = await FlashGovernanceArbiterFactory.deploy(dao.address);
    await flashGovernanceArbiter.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct DAO address", async function () {
      expect(await flashGovernanceArbiter.DAO()).to.equal(dao.address);
    });

    it("Should start with configured = false", async function () {
      expect(await flashGovernanceArbiter.configured()).to.equal(false);
    });
  });

  describe("Configuration", function () {
    it("Should configure flash governance parameters", async function () {
      const asset = mockToken.target as string;
      const amount = ethers.parseEther("100");
      const unlockTime = 3600; // 1 hour
      const assetBurnable = true;

      // First need to make a successful proposal to call configureFlashGovernance
      // For testing, we'll use the owner as the proposal sender
      await flashGovernanceArbiter.connect(owner).configureFlashGovernance(
        asset,
        amount,
        unlockTime,
        assetBurnable
      );

      const config = await flashGovernanceArbiter.flashGovernanceConfig();
      expect(config.asset).to.equal(asset);
      expect(config.amount).to.equal(amount);
      expect(config.unlockTime).to.equal(unlockTime);
      expect(config.assetBurnable).to.equal(assetBurnable);
    });

    it("Should configure security parameters", async function () {
      const maxGovernanceChangePerEpoch = 10;
      const epochSize = 86400; // 1 day
      const changeTolerance = 50;

      await flashGovernanceArbiter.connect(owner).configureSecurityParameters(
        maxGovernanceChangePerEpoch,
        epochSize,
        changeTolerance
      );

      const security = await flashGovernanceArbiter.security();
      expect(security.maxGovernanceChangePerEpoch).to.equal(maxGovernanceChangePerEpoch);
      expect(security.epochSize).to.equal(epochSize);
      expect(security.changeTolerance).to.equal(changeTolerance);
    });
  });

  describe("Governance Approval", function () {
    beforeEach(async function () {
      // Configure flash governance first
      const asset = mockToken.target as string;
      await flashGovernanceArbiter.connect(owner).configureFlashGovernance(
        asset,
        ethers.parseEther("10"),
        3600,
        false
      );

      // Set governed addresses
      await flashGovernanceArbiter.connect(owner).setGoverned(
        [user.address],
        [true]
      );
    });

    it("Should approve governance with sufficient balance and allowance", async function () {
      // Mint tokens to user and approve
      await mockToken.mint(user.address, ethers.parseEther("100"));
      await mockToken.connect(user).approve(
        flashGovernanceArbiter.target as string,
        ethers.parseEther("10")
      );

      // Call assertGovernanceApproved as governed user
      await expect(
        flashGovernanceArbiter.connect(user).assertGovernanceApproved(
          user.address,
          flashGovernanceArbiter.target as string,
          false
        )
      ).to.emit(flashGovernanceArbiter, "flashDecision");
    });

    it("Should revert when not governed", async function () {
      const unauthorizedUser = (await ethers.getSigners())[3];
      await expect(
        flashGovernanceArbiter.connect(unauthorizedUser).assertGovernanceApproved(
          unauthorizedUser.address,
          flashGovernanceArbiter.target as string,
          false
        )
      ).to.be.revertedWith("LIMBO: EP");
    });
  });

  describe("Withdraw and Burn", function () {
    beforeEach(async function () {
      const asset = mockToken.target as string;
      await flashGovernanceArbiter.connect(owner).configureFlashGovernance(
        asset,
        ethers.parseEther("10"),
        0, // unlock immediately for testing
        false
      );

      await flashGovernanceArbiter.connect(owner).setGoverned(
        [user.address],
        [true]
      );

      await mockToken.mint(user.address, ethers.parseEther("100"));
      await mockToken.connect(user).approve(
        flashGovernanceArbiter.target as string,
        ethers.parseEther("10")
      );
    });

    it("Should allow withdrawal after governance decision", async function () {
      // Make governance decision
      await flashGovernanceArbiter.connect(user).assertGovernanceApproved(
        user.address,
        flashGovernanceArbiter.target as string,
        false
      );

      // Withdraw
      await expect(
        flashGovernanceArbiter.connect(user).withdrawGovernanceAsset(
          flashGovernanceArbiter.target as string,
          mockToken.target as string
        )
      ).to.not.be.reverted;
    });

    it("Should burn flash governance asset when configured", async function () {
      const burnableAsset = mockBurnable.target as string;
      await flashGovernanceArbiter.connect(owner).configureFlashGovernance(
        burnableAsset,
        ethers.parseEther("5"),
        0,
        true
      );

      // Burn the governance asset
      await flashGovernanceArbiter.connect(owner).burnFlashGovernanceAsset(
        flashGovernanceArbiter.target as string,
        user.address,
        burnableAsset,
        ethers.parseEther("5")
      );

      // Check that pending decision was deleted
      const pending = await flashGovernanceArbiter.pendingFlashDecision(
        flashGovernanceArbiter.target as string,
        user.address
      );
      expect(pending.amount).to.equal(0);
    });
  });

  describe("Enforcement", function () {
    it("Should set enforcement correctly", async function () {
      await flashGovernanceArbiter.connect(owner).setEnforcement(true);
      // Cannot directly check enforceLimitsActive as it's private
      // But we can verify by calling enforceTolerance
      expect(await flashGovernanceArbiter.enforceTolerance(100, 50)).to.not.be.reverted;
    });

    it("Should not enforce tolerance when enforcement is off", async function () {
      await flashGovernanceArbiter.connect(owner).setEnforcement(false);
      await expect(
        flashGovernanceArbiter.enforceTolerance(100, 200)
      ).to.not.be.reverted;
    });
  });
});