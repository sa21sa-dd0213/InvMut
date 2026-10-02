import { expect } from "chai";
import { ethers } } from "hardhat";

describe("DnGmxBatchingManager mutant kill test - depositUsdc OR mutant", function () {
  it("should detect the OR mutant by depositing twice in the same round", async function () {
    const [owner, keeper, vault, user] = await ethers.getSigners();
    
    // Deploy mock tokens and dependencies
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const usdc = await MockERC20.deploy("USDC", "USDC", 6);
    await usdc.waitForDeployment();
    
    const sGlp = await MockERC20.deploy("sGLP", "sGLP", 18);
    await sGlp.waitForDeployment();
    
    // Deploy mock vault and router
    const MockDnGmxJuniorVault = await ethers.getContractFactory("MockDnGmxJuniorVault");
    const juniorVault = await MockDnGmxJuniorVault.deploy();
    await juniorVault.waitForDeployment();
    
    const MockGlpManager = await ethers.getContractFactory("MockGlpManager");
    const glpManager = await MockGlpManager.deploy();
    await glpManager.waitForDeployment();
    
    const MockRewardRouter = await ethers.getContractFactory("MockRewardRouterV2");
    const rewardRouter = await MockRewardRouter.deploy();
    await rewardRouter.waitForDeployment();
    
    // Deploy the DnGmxBatchingManager
    const Factory = await ethers.getContractFactory("DnGmxBatchingManager");
    const batchingManager = await Factory.deploy();
    await batchingManager.waitForDeployment();
    
    // Initialize the contract
    await batchingManager.initialize(
      await sGlp.getAddress(),
      await usdc.getAddress(),
      await rewardRouter.getAddress(),
      await glpManager.getAddress(),
      await juniorVault.getAddress(),
      keeper.address
    );
    
    // Grant allowances and set up
    await batchingManager.connect(owner).grantAllowances();
    
    // Mint USDC to user and approve
    const depositAmount = ethers.parseUnits("1000", 6);
    await usdc.mint(user.address, depositAmount * 2n);
    await usdc.connect(user).approve(await batchingManager.getAddress(), depositAmount * 2n);
    
    // First deposit in round 1 (current round)
    await batchingManager.connect(user).depositUsdc(depositAmount, user.address);
    
    // Verify first deposit state
    let userDeposit = await batchingManager.userDeposits(user.address);
    expect(userDeposit.round).to.equal(1);
    expect(userDeposit.usdcBalance).to.equal(depositAmount);
    expect(userDeposit.unclaimedShares).to.equal(0);
    
    // Second deposit in the SAME round (round 1)
    // Original: condition (userDepositRound < currentRound && usdcBalance > 0) is FALSE because userDepositRound == currentRound
    // Mutant: condition (userDepositRound < currentRound || usdcBalance > 0) is TRUE because usdcBalance > 0
    // The mutant will incorrectly try to convert current round deposit using uninitialized roundDeposits[0] data
    
    await batchingManager.connect(user).depositUsdc(depositAmount, user.address);
    
    // Check if the mutation caused incorrect state
    // If the OR mutant executed the conversion block, it would try to access roundDeposits[0] 
    // which has totalShares = 0 and totalUsdc = 0, causing division by zero or incorrect accounting
    userDeposit = await batchingManager.userDeposits(user.address);
    
    // In the original, usdcBalance should be 2 * depositAmount (1000 + 1000)
    // In the mutant, usdcBalance would be reset to 0 or incorrect due to the spurious conversion
    const expectedBalance = depositAmount * 2n;
    
    // If the mutant killed the contract or caused incorrect state, this assertion will fail
    // The OR mutant will attempt the conversion and either:
    // 1. Revert due to division by zero (roundDeposits[0] has totalUsdc = 0)
    // 2. Produce incorrect usdcBalance
    // Either way, the test detects the mutation
    
    // Check that the deposit state is still valid
    const roundInfo = await batchingManager.roundDeposits(1);
    expect(roundInfo.totalUsdc).to.equal(expectedBalance);
    
    // Verify user deposit is properly updated (usdcBalance should accumulate)
    expect(userDeposit.usdcBalance).to.equal(expectedBalance);
    expect(userDeposit.round).to.equal(1);
  });
});