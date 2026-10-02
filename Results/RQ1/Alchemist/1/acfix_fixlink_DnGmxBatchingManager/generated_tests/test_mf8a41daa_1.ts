import { expect } from "chai";
import { ethers } from "hardhat";

describe("DnGmxBatchingManager - Kill mutant mf8a41daa (|| instead of && in _claim)", function () {
  it("should NOT convert current-round USDC balance to shares when user deposits in current round before batch execution", async function () {
    const [owner, keeper, vault, user] = await ethers.getSigners();
    
    // Deploy mock tokens and contracts needed
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const sGlp = await MockERC20.deploy("sGLP", "sGLP", 18);
    const usdc = await MockERC20.deploy("USDC", "USDC", 6);
    
    const MockGlpManager = await ethers.getContractFactory("MockGlpManager");
    const glpManager = await MockGlpManager.deploy();
    
    const MockRewardRouter = await ethers.getContractFactory("MockRewardRouterV2");
    const rewardRouter = await MockRewardRouter.deploy();
    
    const MockJuniorVault = await ethers.getContractFactory("MockDnGmxJuniorVault");
    const dnGmxJuniorVault = await MockJuniorVault.deploy();
    
    // Deploy main contract
    const Factory = await ethers.getContractFactory("DnGmxBatchingManager");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize
    await instance.initialize(
      await sGlp.getAddress(),
      await usdc.getAddress(),
      await rewardRouter.getAddress(),
      await glpManager.getAddress(),
      await dnGmxJuniorVault.getAddress(),
      await keeper.getAddress()
    );
    
    // Fund user with USDC
    const depositAmount = ethers.parseUnits("1000", 6);
    await usdc.mint(user.address, depositAmount);
    await usdc.connect(user).approve(await instance.getAddress(), depositAmount);
    
    // User deposits USDC in current round (round 1)
    await instance.connect(user).depositUsdc(depositAmount, user.address);
    
    // Verify user's USDC balance is set and round is current
    const userDepositBefore = await instance.userDeposits(user.address);
    expect(userDepositBefore.usdcBalance).to.equal(depositAmount);
    expect(userDepositBefore.round).to.equal(1);
    expect(userDepositBefore.unclaimedShares).to.equal(0);
    
    // User tries to claim 0 shares (should revert with InvalidInput(0x11))
    await expect(
      instance.connect(user).claim(user.address, 0)
    ).to.be.revertedWithCustomError(instance, "InvalidInput");
    
    // Verify user's state remains unchanged - USDC balance NOT converted to shares
    const userDepositAfter = await instance.userDeposits(user.address);
    expect(userDepositAfter.usdcBalance).to.equal(depositAmount); // Should still have USDC balance
    expect(userDepositAfter.unclaimedShares).to.equal(0); // No shares should have been added
    
    // Also verify unclaimedShares view function returns 0 (no conversion)
    const unclaimedShares = await instance.unclaimedShares(user.address);
    expect(unclaimedShares).to.equal(0);
  });
});