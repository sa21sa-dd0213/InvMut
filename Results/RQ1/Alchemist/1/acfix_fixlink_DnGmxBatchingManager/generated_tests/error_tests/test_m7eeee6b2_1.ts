import { expect } from "chai";
import { ethers } } from "hardhat";

describe("DnGmxBatchingManager mutant m7eeee6b2", function () {
  it("should allow depositToken with non-zero amount (mutant incorrectly reverts)", async function () {
    const [owner, vault] = await ethers.getSigners();
    
    // Deploy mock tokens and dependencies
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const sGlp = await MockERC20.deploy("sGLP", "sGLP", 18);
    const usdc = await MockERC20.deploy("USDC", "USDC", 6);
    
    const MockGlpManager = await ethers.getContractFactory("MockGlpManager");
    const glpManager = await MockGlpManager.deploy();
    
    const MockRewardRouter = await ethers.getContractFactory("MockRewardRouterV2");
    const rewardRouter = await MockRewardRouter.deploy();
    
    const MockJuniorVault = await ethers.getContractFactory("MockDnGmxJuniorVault");
    const dnGmxJuniorVault = await MockJuniorVault.deploy();
    
    // Deploy the contract under test
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
      owner.address
    );
    
    // Setup: mint tokens to vault and approve
    const depositAmount = ethers.parseUnits("100", 18); // non-zero amount
    const mockToken = await MockERC20.deploy("TEST", "TEST", 18);
    await mockToken.mint(vault.address, depositAmount);
    await mockToken.connect(vault).approve(await instance.getAddress(), depositAmount);
    
    // The mutant changes `if (amount == 0)` to `if (amount != 0)`
    // This means the mutant will revert when amount != 0
    // Original would succeed, mutant should revert
    await expect(
      instance.connect(vault).depositToken(
        await mockToken.getAddress(),
        depositAmount,
        0
      )
    ).to.be.revertedWith("InvalidInput"); // Mutant reverts for non-zero amount
    
    // Also verify that zero amount works on mutant (but fails on original)
    await expect(
      instance.connect(vault).depositToken(
        await mockToken.getAddress(),
        0,
        0
      )
    ).to.not.be.reverted; // Mutant allows zero amount, original reverts
  });
});