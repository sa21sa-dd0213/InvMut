import { expect } from "chai";
import { ethers } from "hardhat";

describe("DnGmxBatchingManager - Kill mutant mf2c1bf0d", function () {
  it("should revert when _roundUsdcBalance != 0 after mutant changes == to !=", async function () {
    const [owner, keeper, vault, user] = await ethers.getSigners();

    // Deploy mock contracts needed for constructor
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const sGlp = await MockERC20.deploy("sGLP", "sGLP", 18);
    const usdc = await MockERC20.deploy("USDC", "USDC", 6);

    const MockRewardRouter = await ethers.getContractFactory("MockRewardRouterV2");
    const rewardRouter = await MockRewardRouter.deploy();

    const MockGlpManager = await ethers.getContractFactory("MockGlpManager");
    const glpManager = await MockGlpManager.deploy();

    const MockJuniorVault = await ethers.getContractFactory("MockDnGmxJuniorVault");
    const dnGmxJuniorVault = await MockJuniorVault.deploy();

    // Deploy the DnGmxBatchingManager
    const Factory = await ethers.getContractFactory("DnGmxBatchingManager");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract
    await instance.initialize(
      await sGlp.getAddress(),
      await usdc.getAddress(),
      await rewardRouter.getAddress(),
      await glpManager.getAddress(),
      await dnGmxJuniorVault.getAddress(),
      keeper.address
    );

    // Set keeper
    await instance.connect(owner).setKeeper(keeper.address);

    // Mint USDC to user and approve
    const depositAmount = ethers.parseUnits("1000", 6);
    await usdc.mint(user.address, depositAmount);
    await usdc.connect(user).approve(await instance.getAddress(), depositAmount);

    // User deposits USDC, making _roundUsdcBalance > 0
    await instance.connect(user).depositUsdc(depositAmount, user.address);

    // Verify roundUsdcBalance is now > 0
    const roundBalance = await instance.roundUsdcBalance();
    expect(roundBalance).to.be.gt(0);

    // Call executeBatchStake - should revert on mutant because _roundUsdcBalance != 0
    // but should succeed on original because _roundUsdcBalance == 0 check passes
    await expect(
      instance.connect(keeper).executeBatchStake()
    ).to.be.revertedWith("NoUsdcBalance");
  });
});