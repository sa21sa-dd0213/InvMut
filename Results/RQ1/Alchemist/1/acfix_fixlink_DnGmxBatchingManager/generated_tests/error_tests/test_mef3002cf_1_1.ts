import { expect } from "chai";
import { ethers } from "hardhat";

describe("DnGmxBatchingManager - kill mutant mef3002cf", function () {
  it("should transfer GLP to vault when dnGmxJuniorVaultGlpBalance > 0 in executeBatchDeposit", async function () {
    const [owner, keeper, vault, user] = await ethers.getSigners();
    
    // Deploy mock contracts for dependencies
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const sGlp = await MockERC20.deploy("sGLP", "sGLP", 18);
    const usdc = await MockERC20.deploy("USDC", "USDC", 6);
    
    const MockRewardRouter = await ethers.getContractFactory("MockRewardRouterV2");
    const rewardRouter = await MockRewardRouter.deploy();
    
    const MockGlpManager = await ethers.getContractFactory("MockGlpManager");
    const glpManager = await MockGlpManager.deploy();
    
    const MockVault = await ethers.getContractFactory("MockVault");
    const gmxUnderlyingVault = await MockVault.deploy();
    
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
      await keeper.getAddress()
    );
    
    // Set keeper
    await instance.setKeeper(await keeper.getAddress());
    
    // Grant allowances
    await instance.grantAllowances();
    
    // Setup: deposit token to increase dnGmxJuniorVaultGlpBalance
    // First, transfer some sGLP to the batching manager to simulate depositToken execution
    const depositAmount = ethers.parseUnits("1000", 6); // 1000 USDC
    await usdc.mint(await vault.getAddress(), depositAmount);
    await usdc.connect(vault).approve(await instance.getAddress(), depositAmount);
    
    // Mock the stakeGlp call to return some GLP
    const glpStaked = ethers.parseUnits("100", 18);
    await rewardRouter.setMintAndStakeGlpReturn(glpStaked);
    
    // Call depositToken to increase dnGmxJuniorVaultGlpBalance
    await instance.connect(vault).depositToken(
      await usdc.getAddress(),
      depositAmount,
      0
    );
    
    // Now dnGmxJuniorVaultGlpBalance should be > 0
    
    // Get the vault's sGLP balance before executeBatchDeposit
    const vaultBalanceBefore = await sGlp.balanceOf(await dnGmxJuniorVault.getAddress());
    
    // Set up mock for junior vault deposit to return shares
    const mockShares = ethers.parseUnits("1000", 18);
    await dnGmxJuniorVault.setDepositReturn(mockShares);
    
    // Mock the harvestFees call in executeBatchStake
    // First we need to execute a batch stake to set roundGlpStaked
    // Set mock price for getMinPrice
    await gmxUnderlyingVault.setMinPrice(ethers.parseUnits("1", 30)); // 1 USDC price
    
    // Execute batch stake to set roundGlpStaked
    await instance.connect(keeper).executeBatchStake();
    
    // Now execute batch deposit
    await instance.connect(keeper).executeBatchDeposit();
    
    // Check that GLP was transferred to the vault
    const vaultBalanceAfter = await sGlp.balanceOf(await dnGmxJuniorVault.getAddress());
    
    // The vault should have received GLP (balance increased)
    expect(vaultBalanceAfter).to.be.gt(vaultBalanceBefore);
    
    // Also verify the VaultDeposit event was emitted
    await expect(instance.connect(keeper).executeBatchDeposit())
      .to.emit(instance, "VaultDeposit")
      .withArgs(glpStaked);
  });
});