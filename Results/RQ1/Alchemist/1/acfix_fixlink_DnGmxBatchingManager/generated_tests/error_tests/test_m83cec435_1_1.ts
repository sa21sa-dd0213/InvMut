import { expect } from "chai";
import { ethers } from "hardhat";

describe("DnGmxBatchingManager - kill mutant m83cec435", function () {
  it("should revert depositToken with valid token address in mutant but succeed in original", async function () {
    const [owner, vault, keeper] = await ethers.getSigners();

    // Deploy mock contracts for dependencies
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const MockRewardRouter = await ethers.getContractFactory("MockRewardRouterV2");
    const MockGlpManager = await ethers.getContractFactory("MockGlpManager");
    const MockVault = await ethers.getContractFactory("MockVault");
    const MockJuniorVault = await ethers.getContractFactory("MockDnGmxJuniorVault");

    const usdc = await MockERC20.deploy("USDC", "USDC", 6);
    const sGlp = await MockERC20.deploy("sGLP", "sGLP", 18);
    const rewardRouter = await MockRewardRouter.deploy();
    const gmxUnderlyingVault = await MockVault.deploy();
    const glpManager = await MockGlpManager.deploy(gmxUnderlyingVault.target);
    const dnGmxJuniorVault = await MockJuniorVault.deploy();

    await usdc.waitForDeployment();
    await sGlp.waitForDeployment();
    await rewardRouter.waitForDeployment();
    await gmxUnderlyingVault.waitForDeployment();
    await glpManager.waitForDeployment();
    await dnGmxJuniorVault.waitForDeployment();

    // Deploy the main contract
    const Factory = await ethers.getContractFactory("DnGmxBatchingManager");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize
    await instance.initialize(
      sGlp.target,
      usdc.target,
      rewardRouter.target,
      glpManager.target,
      dnGmxJuniorVault.target,
      keeper.address
    );

    // Setup: transfer some USDC to vault for depositToken
    const depositAmount = ethers.parseUnits("1000", 6);
    await usdc.mint(vault.address, depositAmount);
    await usdc.connect(vault).approve(instance.target, depositAmount);

    // Set up mock to return valid glp amount from mintAndStakeGlp
    await rewardRouter.setMintAndStakeGlpResult(ethers.parseEther("100"));

    // This should succeed in original but revert in mutant because token != address(0)
    // The original allows any non-zero token, mutant only allows zero address
    await expect(
      instance.connect(vault).depositToken(usdc.target, depositAmount, 0)
    ).to.not.be.reverted;

    // Verify the deposit was processed
    const glpBalance = await instance.dnGmxJuniorVaultGlpBalance();
    expect(glpBalance).to.be.gt(0);
  });
});