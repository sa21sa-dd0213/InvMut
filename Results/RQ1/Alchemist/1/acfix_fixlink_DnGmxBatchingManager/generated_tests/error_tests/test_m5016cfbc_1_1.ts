import { expect } from "chai";
import { ethers } from "hardhat";

describe("DnGmxBatchingManager mutant m5016cfbc test", function () {
  it("should revert when vault calls depositToken with inverted access control", async function () {
    const [owner, vault, other] = await ethers.getSigners();

    // Deploy necessary mock contracts for the constructor
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const sGlp = await MockERC20.deploy("sGLP", "sGLP", 18);
    await sGlp.waitForDeployment();

    const usdc = await MockERC20.deploy("USDC", "USDC", 6);
    await usdc.waitForDeployment();

    const MockRewardRouter = await ethers.getContractFactory("MockRewardRouterV2");
    const rewardRouter = await MockRewardRouter.deploy();
    await rewardRouter.waitForDeployment();

    const MockGlpManager = await ethers.getContractFactory("MockGlpManager");
    const glpManager = await MockGlpManager.deploy();
    await glpManager.waitForDeployment();

    // Deploy DnGmxBatchingManager with constructor arguments
    const DnGmxBatchingManager = await ethers.getContractFactory("DnGmxBatchingManager");
    const instance = await DnGmxBatchingManager.deploy();
    await instance.waitForDeployment();

    // Initialize the contract
    await instance.initialize(
      await sGlp.getAddress(),
      await usdc.getAddress(),
      await rewardRouter.getAddress(),
      await glpManager.getAddress(),
      vault.address,
      owner.address
    );

    // Try to call depositToken from the vault address
    // In the original contract, this should succeed (vault is authorized)
    // In the mutant (inverted modifier), this should revert with CallerNotVault
    await expect(
      instance.connect(vault).depositToken(
        await usdc.getAddress(),
        ethers.parseUnits("100", 6),
        0
      )
    ).to.be.revertedWithCustomError(instance, "CallerNotVault");
  });
});