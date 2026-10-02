import { expect } from "chai";
import { ethers } } from "hardhat";

describe("DnGmxBatchingManager - Kill mutant m2d1ded20 (<= instead of < in _claim)", function () {
  let instance: any;
  let owner: any;
  let keeper: any;
  let user: any;
  let sGlp: any;
  let usdc: any;
  let rewardRouter: any;
  let glpManager: any;
  let dnGmxJuniorVault: any;

  beforeEach(async function () {
    const signers = await ethers.getSigners();
    owner = signers[0];
    keeper = signers[1];
    user = signers[2];

    // Deploy mock contracts (simplified for testing)
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const MockGlpManager = await ethers.getContractFactory("MockGlpManager");
    const MockRewardRouter = await ethers.getContractFactory("MockRewardRouter");
    const MockDnGmxJuniorVault = await ethers.getContractFactory("MockDnGmxJuniorVault");

    sGlp = await MockERC20.deploy("sGLP", "sGLP");
    usdc = await MockERC20.deploy("USDC", "USDC");
    rewardRouter = await MockRewardRouter.deploy();
    glpManager = await MockGlpManager.deploy();
    dnGmxJuniorVault = await MockDnGmxJuniorVault.deploy();

    // Deploy DnGmxBatchingManager
    const Factory = await ethers.getContractFactory("DnGmxBatchingManager");
    instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract
    await instance.initialize(
      await sGlp.getAddress(),
      await usdc.getAddress(),
      await rewardRouter.getAddress(),
      await glpManager.getAddress(),
      await dnGmxJuniorVault.getAddress(),
      await keeper.getAddress()
    );

    // Setup: mint USDC to user and approve
    await usdc.mint(await user.getAddress(), ethers.parseEther("1000"));
    await usdc.connect(user).approve(await instance.getAddress(), ethers.parseEther("1000"));
  });

  it("should revert when claiming shares from current round before batch deposit (mutant would incorrectly allow)", async function () {
    // User deposits USDC in current round (round 1)
    await instance.connect(user).depositUsdc(ethers.parseEther("100"), await user.getAddress());

    // Attempt to claim shares - this should revert because:
    // - userDepositRound (1) == currentRound (1)
    // - Original: userDepositRound < currentRound is FALSE, so no conversion happens
    // - Mutant: userDepositRound <= currentRound is TRUE, incorrectly converts balance to shares
    // User has 0 unclaimedShares, so should revert with InsufficientShares
    await expect(
      instance.connect(user).claim(await user.getAddress(), 1)
    ).to.be.revertedWithCustomError(instance, "InsufficientShares");

    // Verify state is unchanged - user still has USDC balance in current round
    expect(await instance.usdcBalance(await user.getAddress())).to.equal(ethers.parseEther("100"));
  });
});