import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { 
  DnGmxBatchingManager, 
  DnGmxBatchingManager__factory,
  IERC20,
  IERC20__factory,
  IDnGmxJuniorVault,
  IDnGmxJuniorVault__factory,
  IGlpManager,
  IGlpManager__factory,
  IRewardRouterV2,
  IRewardRouterV2__factory,
  IVault,
  IVault__factory
} from "../typechain-types";

describe("DnGmxBatchingManager", function () {
  let owner: SignerWithAddress;
  let keeper: SignerWithAddress;
  let user: SignerWithAddress;
  let vault: SignerWithAddress;
  let batchingManager: DnGmxBatchingManager;
  let mockSGlp: IERC20;
  let mockUsdc: IERC20;
  let mockRewardRouter: IRewardRouterV2;
  let mockGlpManager: IGlpManager;
  let mockGmxUnderlyingVault: IVault;
  let mockDnGmxJuniorVault: IDnGmxJuniorVault;

  beforeEach(async function () {
    [owner, keeper, user, vault] = await ethers.getSigners();

    // Deploy mock contracts
    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    mockSGlp = await ERC20Mock.deploy("sGLP", "sGLP", 18);
    mockUsdc = await ERC20Mock.deploy("USDC", "USDC", 6);

    const RewardRouterV2Mock = await ethers.getContractFactory("RewardRouterV2Mock");
    mockRewardRouter = await RewardRouterV2Mock.deploy();

    const GlpManagerMock = await ethers.getContractFactory("GlpManagerMock");
    mockGlpManager = await GlpManagerMock.deploy();

    const VaultMock = await ethers.getContractFactory("VaultMock");
    mockGmxUnderlyingVault = await VaultMock.deploy();

    const DnGmxJuniorVaultMock = await ethers.getContractFactory("DnGmxJuniorVaultMock");
    mockDnGmxJuniorVault = await DnGmxJuniorVaultMock.deploy(mockSGlp.address);

    // Set up GlpManager to return vault address
    await mockGlpManager.setVault(mockGmxUnderlyingVault.address);

    // Deploy the actual contract
    const DnGmxBatchingManagerFactory = (await ethers.getContractFactory("DnGmxBatchingManager")) as DnGmxBatchingManager__factory;
    batchingManager = await DnGmxBatchingManagerFactory.deploy();
    await batchingManager.deployed();

    // Initialize
    await batchingManager.initialize(
      mockSGlp.address,
      mockUsdc.address,
      mockRewardRouter.address,
      mockGlpManager.address,
      mockDnGmxJuniorVault.address,
      keeper.address
    );

    // Grant allowances
    await batchingManager.grantAllowances();
  });

  describe("Initialization", function () {
    it("should set the correct initial values", async function () {
      expect(await batchingManager.keeper()).to.equal(keeper.address);
      expect(await batchingManager.currentRound()).to.equal(1);
      expect(await batchingManager.paused()).to.equal(false);
    });

    it("should revert when initializing twice", async function () {
      await expect(
        batchingManager.initialize(
          mockSGlp.address,
          mockUsdc.address,
          mockRewardRouter.address,
          mockGlpManager.address,
          mockDnGmxJuniorVault.address,
          keeper.address
        )
      ).to.be.revertedWith("Initializable: contract is already initialized");
    });
  });

  describe("Access Control", function () {
    it("should allow keeper to pause and unpause", async function () {
      await batchingManager.connect(keeper).pauseDeposit();
      expect(await batchingManager.paused()).to.equal(true);

      // Need to wait for cooldown or use executeBatchDeposit which unpauses
      // For testing, we'll just check pause works
      await batchingManager.connect(keeper).unpauseDeposit();
      expect(await batchingManager.paused()).to.equal(false);
    });

    it("should revert when non-keeper tries to pause", async function () {
      await expect(
        batchingManager.connect(user).pauseDeposit()
      ).to.be.revertedWithCustomError(batchingManager, "CallerNotKeeper");
    });

    it("should allow owner to set keeper", async function () {
      await batchingManager.connect(owner).setKeeper(user.address);
      expect(await batchingManager.keeper()).to.equal(user.address);
    });
  });

  describe("Deposit Functions", function () {
    beforeEach(async function () {
      // Mint USDC to vault and approve batchingManager
      await mockUsdc.mint(vault.address, ethers.utils.parseUnits("1000", 6));
      await mockUsdc.connect(vault).approve(batchingManager.address, ethers.utils.parseUnits("1000", 6));
    });

    it("should allow vault to deposit tokens", async function () {
      const amount = ethers.utils.parseUnits("100", 6);
      await mockUsdc.connect(vault).approve(batchingManager.address, amount);
      
      // Mint sGLP to reward router mock for staking
      await mockSGlp.mint(batchingManager.address, amount);
      
      await expect(
        batchingManager.connect(vault).depositToken(
          mockUsdc.address,
          amount,
          0
        )
      ).to.emit(batchingManager, "DepositToken");
    });

    it("should allow users to deposit USDC", async function () {
      const amount = ethers.utils.parseUnits("100", 6);
      await mockUsdc.mint(user.address, amount);
      await mockUsdc.connect(user).approve(batchingManager.address, amount);

      await expect(
        batchingManager.connect(user).depositUsdc(amount, user.address)
      ).to.emit(batchingManager, "DepositToken");
    });

    it("should update user balance after USDC deposit", async function () {
      const amount = ethers.utils.parseUnits("100", 6);
      await mockUsdc.mint(user.address, amount);
      await mockUsdc.connect(user).approve(batchingManager.address, amount);

      await batchingManager.connect(user).depositUsdc(amount, user.address);
      expect(await batchingManager.usdcBalance(user.address)).to.equal(amount);
    });
  });

  describe("Batch Operations", function () {
    beforeEach(async function () {
      // Setup: deposit USDC from user
      const amount = ethers.utils.parseUnits("100", 6);
      await mockUsdc.mint(user.address, amount);
      await mockUsdc.connect(user).approve(batchingManager.address, amount);
      await batchingManager.connect(user).depositUsdc(amount, user.address);

      // Setup reward router to mint sGLP
      await mockSGlp.mint(batchingManager.address, ethers.utils.parseUnits("100", 18));
    });

    it("should execute batch stake", async function () {
      // Mock vault price
      await mockGmxUnderlyingVault.setMinPrice(ethers.utils.parseUnits("1", 30));

      await expect(
        batchingManager.connect(keeper).executeBatchStake()
      ).to.emit(batchingManager, "BatchStake");
    });

    it("should execute batch deposit after stake", async function () {
      // First execute batch stake
      await mockGmxUnderlyingVault.setMinPrice(ethers.utils.parseUnits("1", 30));
      await batchingManager.connect(keeper).executeBatchStake();

      // Then execute batch deposit
      await expect(
        batchingManager.connect(keeper).executeBatchDeposit()
      ).to.emit(batchingManager, "BatchDeposit");
    });
  });

  describe("Claim Functions", function () {
    beforeEach(async function () {
      // Full flow: deposit, stake, deposit to vault
      const amount = ethers.utils.parseUnits("100", 6);
      await mockUsdc.mint(user.address, amount);
      await mockUsdc.connect(user).approve(batchingManager.address, amount);
      await batchingManager.connect(user).depositUsdc(amount, user.address);

      await mockGmxUnderlyingVault.setMinPrice(ethers.utils.parseUnits("1", 30));
      await batchingManager.connect(keeper).executeBatchStake();
      await batchingManager.connect(keeper).executeBatchDeposit();
    });

    it("should allow user to claim shares", async function () {
      const unclaimedShares = await batchingManager.unclaimedShares(user.address);
      expect(unclaimedShares).to.be.gt(0);

      // Mint shares to batchingManager for transfer
      const shares = ethers.utils.parseUnits("100", 18);
      await mockDnGmxJuniorVault.mint(batchingManager.address, shares);

      await expect(
        batchingManager.connect(user).claim(user.address, unclaimedShares)
      ).to.emit(batchingManager, "SharesClaimed");
    });

    it("should revert when claiming zero shares", async function () {
      await expect(
        batchingManager.connect(user).claim(user.address, 0)
      ).to.be.revertedWithCustomError(batchingManager, "InvalidInput");
    });
  });

  describe("Edge Cases", function () {
    it("should revert when depositing zero USDC", async function () {
      await expect(
        batchingManager.connect(user).depositUsdc(0, user.address)
      ).to.be.revertedWithCustomError(batchingManager, "InvalidInput");
    });

    it("should revert when depositing to zero address", async function () {
      const amount = ethers.utils.parseUnits("100", 6);
      await expect(
        batchingManager.connect(user).depositUsdc(amount, ethers.constants.AddressZero)
      ).to.be.revertedWithCustomError(batchingManager, "InvalidInput");
    });

    it("should revert when executing batch stake with no balance", async function () {
      await expect(
        batchingManager.connect(keeper).executeBatchStake()
      ).to.be.revertedWithCustomError(batchingManager, "NoUsdcBalance");
    });
  });
});