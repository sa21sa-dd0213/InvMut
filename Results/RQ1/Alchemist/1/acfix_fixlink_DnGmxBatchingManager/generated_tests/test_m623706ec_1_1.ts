import { expect } from "chai";
import { ethers } from "hardhat";

describe("DnGmxBatchingManager mutant m623706ec detection", function () {
  it("should revert or not emit VaultDeposit when dnGmxJuniorVaultGlpBalance is zero in executeBatchDeposit", async function () {
    const [owner, keeper, vault, user] = await ethers.getSigners();

    // Deploy mock contracts for dependencies
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const MockVault = await ethers.getContractFactory("MockVault");
    const MockRewardRouter = await ethers.getContractFactory("MockRewardRouter");
    const MockGlpManager = await ethers.getContractFactory("MockGlpManager");
    const MockJuniorVault = await ethers.getContractFactory("MockJuniorVault");

    const sGlp = await MockERC20.deploy("sGLP", "sGLP", 18);
    const usdc = await MockERC20.deploy("USDC", "USDC", 6);
    const rewardRouter = await MockRewardRouter.deploy();
    const glpManager = await MockGlpManager.deploy();
    const gmxUnderlyingVault = await MockVault.deploy();
    const dnGmxJuniorVault = await MockJuniorVault.deploy();

    // Setup mock contracts
    await glpManager.setVault(gmxUnderlyingVault.address);

    // Deploy the DnGmxBatchingManager
    const Factory = await ethers.getContractFactory("DnGmxBatchingManager");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract
    await instance.initialize(
      sGlp.target,
      usdc.target,
      rewardRouter.target,
      glpManager.target,
      dnGmxJuniorVault.target,
      keeper.address
    );

    // Set keeper
    await instance.connect(owner).setKeeper(keeper.address);

    // Ensure dnGmxJuniorVaultGlpBalance is 0 (it should be initially)
    // We need to make the contract not paused and ensure lastUnpauseTimestamp is set
    // First, we need to unpause if paused
    // The contract starts unpaused, but we need to set lastUnpauseTimestamp
    // We can do this by calling executeBatchDeposit which will set it

    // To make the test work, we need to set lastUnpauseTimestamp to allow executeBatchDeposit
    // We can do this by first calling executeBatchDeposit which will set it
    // But that might cause issues. Let's check the contract logic.

    // Actually, let's just check the condition directly by calling executeBatchDeposit
    // when dnGmxJuniorVaultGlpBalance is 0 and verify no VaultDeposit event is emitted

    // Get the initial balance of dnGmxJuniorVault for sGlp
    const initialVaultBalance = await sGlp.balanceOf(dnGmxJuniorVault.target);

    // Call executeBatchDeposit as keeper
    // This should not emit VaultDeposit event since dnGmxJuniorVaultGlpBalance is 0
    const tx = await instance.connect(keeper).executeBatchDeposit();
    const receipt = await tx.wait();

    // Check that no VaultDeposit event was emitted
    const vaultDepositEvents = receipt.logs.filter(
      (log: any) => log.eventName === "VaultDeposit"
    );
    expect(vaultDepositEvents.length).to.equal(0);

    // Also verify that sGlp balance of vault hasn't changed
    const finalVaultBalance = await sGlp.balanceOf(dnGmxJuniorVault.target);
    expect(finalVaultBalance).to.equal(initialVaultBalance);

    // If the mutant is present (>= 0), the VaultDeposit event would be emitted
    // even with 0 balance, which should cause the test to fail
  });
});