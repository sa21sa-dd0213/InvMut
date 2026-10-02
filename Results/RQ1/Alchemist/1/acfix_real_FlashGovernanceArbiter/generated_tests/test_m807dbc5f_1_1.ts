import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { FlashGovernanceArbiter, MockERC20, MockBurnable } from "../typechain-types";

describe("FlashGovernanceArbiter", function () {
  let flashGovernanceArbiter: FlashGovernanceArbiter;
  let mockERC20: MockERC20;
  let mockBurnable: MockBurnable;
  let owner: SignerWithAddress;
  let user: SignerWithAddress;
  let dao: SignerWithAddress;
  let proposalFactory: SignerWithAddress;

  beforeEach(async function () {
    [owner, user, dao, proposalFactory] = await ethers.getSigners();

    // Deploy mock contracts
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    mockERC20 = await MockERC20Factory.deploy("Mock Token", "MTK", 18);
    await mockERC20.deployed();

    const MockBurnableFactory = await ethers.getContractFactory("MockBurnable");
    mockBurnable = await MockBurnableFactory.deploy();
    await mockBurnable.deployed();

    // Deploy FlashGovernanceArbiter
    const FlashGovernanceArbiterFactory = await ethers.getContractFactory("FlashGovernanceArbiter");
    flashGovernanceArbiter = await FlashGovernanceArbiterFactory.deploy(dao.address);
    await flashGovernanceArbiter.deployed();

    // Setup DAO
    await flashGovernanceArbiter.connect(dao).setDAO(dao.address);
    
    // Configure flash governance
    await flashGovernanceArbiter.connect(dao).configureFlashGovernance(
      mockERC20.address,
      ethers.utils.parseEther("100"),
      86400, // 1 day unlock time
      true
    );

    // Configure security parameters
    await flashGovernanceArbiter.connect(dao).configureSecurityParameters(
      10, // maxGovernanceChangePerEpoch
      3600, // epochSize (1 hour)
      5 // changeTolerance (5%)
    );

    // Set governed contracts
    await flashGovernanceArbiter.connect(dao).setGoverned(
      [flashGovernanceArbiter.address],
      [true]
    );

    // End configuration
    await flashGovernanceArbiter.connect(dao).endConfiguration();
  });

  describe("Deployment", function () {
    it("should set the correct DAO", async function () {
      expect(await flashGovernanceArbiter.DAO()).to.equal(dao.address);
    });

    it("should be configured after endConfiguration", async function () {
      expect(await flashGovernanceArbiter.configured()).to.be.true;
    });
  });

  describe("Flash Governance", function () {
    it("should allow governance approval with valid parameters", async function () {
      // Approve tokens for flash governance
      await mockERC20.approve(flashGovernanceArbiter.address, ethers.utils.parseEther("100"));
      
      // Fast forward time to avoid epoch restrictions
      await ethers.provider.send("evm_increaseTime", [3601]);
      await ethers.provider.send("evm_mine", []);

      await expect(
        flashGovernanceArbiter.connect(dao).assertGovernanceApproved(
          user.address,
          flashGovernanceArbiter.address,
          false
        )
      ).to.emit(flashGovernanceArbiter, "flashDecision");
    });

    it("should revert when governance decision is rejected", async function () {
      await expect(
        flashGovernanceArbiter.connect(dao).assertGovernanceApproved(
          user.address,
          flashGovernanceArbiter.address,
          false
        )
      ).to.be.revertedWith("LIMBO: governance decision rejected.");
    });
  });

  describe("Withdraw Governance Asset", function () {
    it("should allow withdrawal after unlock time", async function () {
      // Setup flash governance decision
      await mockERC20.approve(flashGovernanceArbiter.address, ethers.utils.parseEther("100"));
      await ethers.provider.send("evm_increaseTime", [3601]);
      await ethers.provider.send("evm_mine", []);

      await flashGovernanceArbiter.connect(dao).assertGovernanceApproved(
        user.address,
        flashGovernanceArbiter.address,
        false
      );

      // Fast forward past unlock time
      await ethers.provider.send("evm_increaseTime", [86401]);
      await ethers.provider.send("evm_mine", []);

      await expect(
        flashGovernanceArbiter.connect(user).withdrawGovernanceAsset(
          flashGovernanceArbiter.address,
          mockERC20.address
        )
      ).to.changeTokenBalance(mockERC20, user, ethers.utils.parseEther("100"));
    });
  });

  describe("Burn Flash Governance Asset", function () {
    it("should burn assets when assetBurnable is true", async function () {
      // Setup flash governance decision
      await mockERC20.approve(flashGovernanceArbiter.address, ethers.utils.parseEther("100"));
      await ethers.provider.send("evm_increaseTime", [3601]);
      await ethers.provider.send("evm_mine", []);

      await flashGovernanceArbiter.connect(dao).assertGovernanceApproved(
        user.address,
        flashGovernanceArbiter.address,
        false
      );

      // Burn the asset
      await flashGovernanceArbiter.connect(dao).burnFlashGovernanceAsset(
        flashGovernanceArbiter.address,
        user.address,
        mockERC20.address,
        ethers.utils.parseEther("100")
      );

      // Verify pending decision is deleted
      const pending = await flashGovernanceArbiter.pendingFlashDecision(
        flashGovernanceArbiter.address,
        user.address
      );
      expect(pending.amount).to.equal(0);
    });
  });

  describe("Enforcement", function () {
    it("should enforce tolerance limits when active", async function () {
      await flashGovernanceArbiter.connect(user).setEnforcement(true);
      
      // This should pass as 100 and 100 have 0% difference
      await flashGovernanceArbiter.connect(user).enforceTolerance(100, 100);
      
      // This should revert as 100 and 200 have 100% difference > 5% tolerance
      await expect(
        flashGovernanceArbiter.connect(user).enforceTolerance(100, 200)
      ).to.be.revertedWith("FE1");
    });

    it("should not enforce tolerance when enforcement is not active", async function () {
      await flashGovernanceArbiter.connect(user).enforceTolerance(100, 200);
      // Should not revert
    });
  });
});