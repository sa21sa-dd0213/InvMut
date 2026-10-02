import { expect } from "chai";
import { ethers } from "hardhat";

describe("DnGmxBatchingManager mutant mb26cc7c6 test", function () {
  it("should detect the mutant that changes < to > in depositUsdc by testing unclaimed shares conversion for previous round deposits", async function () {
    const [owner, keeper, vault, user] = await ethers.getSigners();
    
    // Deploy mock contracts needed for the constructor
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const sGlp = await MockERC20.deploy("sGLP", "sGLP", 18);
    const usdc = await MockERC20.deploy("USDC", "USDC", 6);
    
    const MockRewardRouter = await ethers.getContractFactory("MockRewardRouterV2");
    const rewardRouter = await MockRewardRouter.deploy();
    
    const MockGlpManager = await ethers.getContractFactory("MockGlpManager");
    const glpManager = await MockGlpManager.deploy();
    
    const MockJuniorVault = await ethers.getContractFactory("MockDnGmxJuniorVault");
    const dnGmxJuniorVault = await MockJuniorVault.deploy();
    
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
      await dnGmxJuniorVault.getAddress(),
      await keeper.getAddress()
    );
    
    // Set keeper
    await instance.connect(owner).setKeeper(await keeper.getAddress());
    
    // Grant USDC allowance to the contract for user deposits
    const usdcAmount = ethers.parseUnits("1000", 6);
    await usdc.mint(await user.getAddress(), usdcAmount);
    await usdc.connect(user).approve(await instance.getAddress(), usdcAmount);
    
    // First deposit in round 1
    await instance.connect(user).depositUsdc(usdcAmount, await user.getAddress());
    
    // Check user has deposit in round 1
    const userDeposit1 = await instance.userDeposits(await user.getAddress());
    expect(userDeposit1.round).to.equal(1);
    expect(userDeposit1.usdcBalance).to.equal(usdcAmount);
    expect(userDeposit1.unclaimedShares).to.equal(0);
    
    // Execute batch stake and deposit to advance to round 2
    // Mock the required calls for executeBatchStake
    await usdc.mint(await instance.getAddress(), usdcAmount); // Give USDC to contract for staking
    await instance.connect(keeper).executeBatchStake();
    
    // Mock the vault deposit for executeBatchDeposit
    // The contract will transfer sGlp to vault, then vault deposits
    await sGlp.mint(await instance.getAddress(), ethers.parseEther("100"));
    await instance.connect(keeper).executeBatchDeposit();
    
    // Now current round should be 2
    expect(await instance.currentRound()).to.equal(2);
    
    // User's first deposit should now be convertible to shares
    // Check unclaimedShares before second deposit
    const sharesBefore = await instance.unclaimedShares(await user.getAddress());
    expect(sharesBefore).to.be.gt(0); // Should have some shares from round 1 conversion
    
    // Make second deposit in round 2
    const usdcAmount2 = ethers.parseUnits("500", 6);
    await usdc.mint(await user.getAddress(), usdcAmount2);
    await usdc.connect(user).approve(await instance.getAddress(), usdcAmount2);
    await instance.connect(user).depositUsdc(usdcAmount2, await user.getAddress());
    
    // Check unclaimedShares after second deposit
    const sharesAfter = await instance.unclaimedShares(await user.getAddress());
    
    // In the original contract, the old deposit from round 1 was converted during the second deposit
    // In the mutant (with > instead of <), this conversion would NOT happen
    // So the mutant would have fewer shares than expected
    
    // The expected behavior: user should have their round 1 shares (from conversion) + round 2 deposit (no shares yet)
    // We can verify this by checking that shares increased from the conversion
    expect(sharesAfter).to.be.gt(sharesBefore);
    
    // Additional verification: check that userDeposit round is now 2
    const userDeposit2 = await instance.userDeposits(await user.getAddress());
    expect(userDeposit2.round).to.equal(2);
    
    // The mutant would fail this assertion because it wouldn't convert the round 1 deposit
    // In the mutant, sharesBefore would be 0 (no conversion happened), and sharesAfter would be 0
    // This test kills the mutant by proving the conversion logic works correctly
  });
});