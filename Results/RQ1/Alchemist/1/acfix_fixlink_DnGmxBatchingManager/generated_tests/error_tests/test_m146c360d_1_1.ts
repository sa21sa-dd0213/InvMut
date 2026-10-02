import { expect } from "chai";
import { ethers } from "hardhat";

describe("DnGmxBatchingManager - mutant m146c360d test", function () {
  it("should kill the mutant by verifying unclaimedShares includes previous round deposits when usdcBalance > 0", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy mock tokens and required contracts for testing
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const usdc = await MockERC20.deploy("USDC", "USDC", 6);
    await usdc.waitForDeployment();

    const sGlp = await MockERC20.deploy("sGLP", "sGLP", 18);
    await sGlp.waitForDeployment();

    // Deploy mock GMX contracts
    const MockGlpManager = await ethers.getContractFactory("MockGlpManager");
    const glpManager = await MockGlpManager.deploy();
    await glpManager.waitForDeployment();

    const MockRewardRouter = await ethers.getContractFactory("MockRewardRouterV2");
    const rewardRouter = await MockRewardRouter.deploy();
    await rewardRouter.waitForDeployment();

    const MockJuniorVault = await ethers.getContractFactory("MockDnGmxJuniorVault");
    const juniorVault = await MockJuniorVault.deploy();
    await juniorVault.waitForDeployment();

    // Deploy the main contract
    const Factory = await ethers.getContractFactory("DnGmxBatchingManager");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract
    await instance.initialize(
      await sGlp.getAddress(),
      await usdc.getAddress(),
      await rewardRouter.getAddress(),
      await glpManager.getAddress(),
      await juniorVault.getAddress(),
      owner.address
    );

    // Grant allowances
    await instance.grantAllowances();

    // Fund user with USDC and approve
    const depositAmount = ethers.parseUnits("1000", 6); // 1000 USDC
    await usdc.mint(user.address, depositAmount);
    await usdc.connect(user).approve(await instance.getAddress(), depositAmount);

    // User deposits USDC in round 1
    await instance.connect(user).depositUsdc(depositAmount, user.address);

    // Execute batch stake to complete round 1
    // First set keeper and unpause
    await instance.setKeeper(owner.address);
    await instance.unpauseDeposit();

    // Set up scenario: user has deposit in previous round (round 1)
    // and current round is 2
    await instance.setCurrentRound(2);

    // Set round 1 deposit data
    await instance.setRoundDeposit(1, depositAmount, ethers.parseUnits("100", 18)); // 100 shares for 1000 USDC

    // Now call unclaimedShares - the mutant will fail because usdcBalance < 0 is never true
    // while original correctly processes usdcBalance > 0
    const shares = await instance.unclaimedShares(user.address);

    // Original would return shares > 0 (converted from previous round deposit)
    // Mutant returns 0 because condition usdcBalance < 0 is always false
    expect(shares).to.be.gt(0, "unclaimedShares should include previous round deposits");
  });
});