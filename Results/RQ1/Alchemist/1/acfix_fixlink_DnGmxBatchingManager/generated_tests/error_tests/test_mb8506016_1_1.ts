import { expect } from "chai";
import { ethers } from "hardhat";

describe("DnGmxBatchingManager - kill mutant mb8506016 (depositUsdc: + replaced with *)", function () {
  let instance: any;
  let owner: any;
  let addr1: any;
  let usdcToken: any;
  let sGlpToken: any;
  let rewardRouter: any;
  let glpManager: any;
  let dnGmxJuniorVault: any;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();

    // Deploy mock ERC20 tokens for USDC and sGLP
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    usdcToken = await ERC20Factory.deploy("USD Coin", "USDC", 6);
    await usdcToken.waitForDeployment();
    sGlpToken = await ERC20Factory.deploy("Staked GLP", "sGLP", 18);
    await sGlpToken.waitForDeployment();

    // Deploy mock GMX dependencies
    const MockGlpManager = await ethers.getContractFactory("MockGlpManager");
    glpManager = await MockGlpManager.deploy();
    await glpManager.waitForDeployment();

    const MockRewardRouter = await ethers.getContractFactory("MockRewardRouterV2");
    rewardRouter = await MockRewardRouter.deploy();
    await rewardRouter.waitForDeployment();

    const MockVault = await ethers.getContractFactory("MockVault");
    const gmxUnderlyingVault = await MockVault.deploy();
    await gmxUnderlyingVault.waitForDeployment();

    // Link glpManager to vault
    await glpManager.setVault(gmxUnderlyingVault.target);

    // Deploy mock junior vault
    const MockJuniorVault = await ethers.getContractFactory("MockDnGmxJuniorVault");
    dnGmxJuniorVault = await MockJuniorVault.deploy();
    await dnGmxJuniorVault.waitForDeployment();

    // Deploy the actual DnGmxBatchingManager
    const Factory = await ethers.getContractFactory("DnGmxBatchingManager");
    instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract
    await instance.initialize(
      sGlpToken.target,
      usdcToken.target,
      rewardRouter.target,
      glpManager.target,
      dnGmxJuniorVault.target,
      owner.address
    );

    // Mint USDC to addr1 for testing
    const mintAmount = ethers.parseUnits("1000", 6);
    await usdcToken.mint(addr1.address, mintAmount);

    // Approve the batching manager to spend addr1's USDC
    await usdcToken.connect(addr1).approve(instance.target, mintAmount);
  });

  it("should detect mutant by verifying USDC balance addition instead of multiplication", async function () {
    // First deposit: 100 USDC
    const firstDeposit = ethers.parseUnits("100", 6);
    await instance.connect(addr1).depositUsdc(firstDeposit, addr1.address);

    // Check balance after first deposit
    let balance = await instance.usdcBalance(addr1.address);
    expect(balance).to.equal(firstDeposit);

    // Second deposit: 50 USDC - if mutant exists, balance would be 100 * 50 = 5000 instead of 150
    const secondDeposit = ethers.parseUnits("50", 6);
    await instance.connect(addr1).depositUsdc(secondDeposit, addr1.address);

    // Assert the balance is the sum, not the product
    balance = await instance.usdcBalance(addr1.address);
    expect(balance).to.equal(firstDeposit + secondDeposit);
    // The mutant would set balance to 100 * 50 = 5000, which would NOT equal 150, thus killing the mutant
  });
});