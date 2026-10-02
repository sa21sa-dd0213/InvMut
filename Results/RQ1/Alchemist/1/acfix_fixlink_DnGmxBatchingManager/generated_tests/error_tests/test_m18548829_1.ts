import { expect } from "chai";
import { ethers } from "hardhat";

describe("DnGmxBatchingManager mutant m18548829 - depositUsdc subtraction bug", function () {
  let instance: any;
  let owner: any;
  let addr1: any;
  let usdcMock: any;
  let sGlpMock: any;
  let rewardRouterMock: any;
  let glpManagerMock: any;
  let gmxUnderlyingVaultMock: any;
  let dnGmxJuniorVaultMock: any;

  before(async function () {
    [owner, addr1] = await ethers.getSigners();

    // Deploy mock contracts for dependencies
    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    usdcMock = await ERC20Mock.deploy("USDC", "USDC", 6);
    await usdcMock.waitForDeployment();

    sGlpMock = await ERC20Mock.deploy("sGLP", "sGLP", 18);
    await sGlpMock.waitForDeployment();

    const RewardRouterMock = await ethers.getContractFactory("RewardRouterMock");
    rewardRouterMock = await RewardRouterMock.deploy();
    await rewardRouterMock.waitForDeployment();

    const GlpManagerMock = await ethers.getContractFactory("GlpManagerMock");
    glpManagerMock = await GlpManagerMock.deploy();
    await glpManagerMock.waitForDeployment();

    const VaultMock = await ethers.getContractFactory("VaultMock");
    gmxUnderlyingVaultMock = await VaultMock.deploy();
    await gmxUnderlyingVaultMock.waitForDeployment();

    const JuniorVaultMock = await ethers.getContractFactory("JuniorVaultMock");
    dnGmxJuniorVaultMock = await JuniorVaultMock.deploy();
    await dnGmxJuniorVaultMock.waitForDeployment();

    // Set vault address in glpManager mock
    await glpManagerMock.setVault(gmxUnderlyingVaultMock.target);

    // Deploy the main contract
    const Factory = await ethers.getContractFactory("DnGmxBatchingManager");
    instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract
    await instance.initialize(
      sGlpMock.target,
      usdcMock.target,
      rewardRouterMock.target,
      glpManagerMock.target,
      dnGmxJuniorVaultMock.target,
      owner.address
    );

    // Mint USDC to addr1 for testing
    const depositAmount = ethers.parseUnits("1000", 6); // 1000 USDC
    await usdcMock.mint(addr1.address, depositAmount);
    await usdcMock.connect(addr1).approve(instance.target, depositAmount);
  });

  it("should increase user USDC balance after depositUsdc - kills mutant that uses subtraction", async function () {
    const depositAmount = ethers.parseUnits("500", 6); // 500 USDC

    // Get initial balance of addr1 in the contract
    const initialBalance = await instance.usdcBalance(addr1.address);

    // Perform deposit
    const tx = await instance.connect(addr1).depositUsdc(depositAmount, addr1.address);
    await tx.wait();

    // Get balance after deposit
    const finalBalance = await instance.usdcBalance(addr1.address);

    // In the original contract, balance should increase by depositAmount
    // In the mutant (using subtraction), this will either revert (if initial balance is 0)
    // or show a decreased balance
    expect(finalBalance).to.equal(initialBalance + depositAmount);
  });

  it("should revert on deposit when amount is zero - should still pass with mutant", async function () {
    await expect(
      instance.connect(addr1).depositUsdc(0, addr1.address)
    ).to.be.revertedWithCustomError(instance, "InvalidInput");
  });
});