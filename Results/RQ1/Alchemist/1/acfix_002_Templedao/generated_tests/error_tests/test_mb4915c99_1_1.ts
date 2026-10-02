import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant kill test - _notifyReward division vs addition", function () {
  it("should kill mutant mb4915c99 by verifying correct reward calculation when notifying reward during ongoing period", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy a mock ERC20 for staking token and reward token
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    const stakingToken = await ERC20Factory.deploy("Staking", "STK", 18);
    await stakingToken.waitForDeployment();
    const rewardToken = await ERC20Factory.deploy("Reward", "RWD", 18);
    await rewardToken.waitForDeployment();

    // Deploy StaxLPStaking
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const staking = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await staking.waitForDeployment();

    // Setup: add reward token and fund accounts
    await staking.connect(owner).addReward(await rewardToken.getAddress());

    // Mint tokens to user and owner
    await stakingToken.mint(user.address, ethers.parseEther("1000"));
    await rewardToken.mint(owner.address, ethers.parseEther("1000"));

    // Approve tokens
    await stakingToken.connect(user).approve(await staking.getAddress(), ethers.parseEther("1000"));
    await rewardToken.connect(owner).approve(await staking.getAddress(), ethers.parseEther("1000"));

    // Step 1: User stakes tokens
    await staking.connect(user).stake(ethers.parseEther("100"));

    // Step 2: First reward notification - 700 tokens over 7 days (100 per day rate)
    const DURATION = 86400 * 7;
    const firstReward = ethers.parseEther("700");
    await staking.connect(owner).notifyRewardAmount(await rewardToken.getAddress(), firstReward);

    // Step 3: Wait half the duration (3.5 days = 302400 seconds)
    await ethers.provider.send("evm_increaseTime", [302400]);
    await ethers.provider.send("evm_mine", []);

    // Step 4: Second reward notification - 350 tokens while first period is still active
    // In original: leftover = (periodFinish - now) * rewardRate = (604800 - 302400) * (700/604800) = 302400 * 0.001157... = 350
    // New rewardRate = (350 + 350) / 604800 = 700/604800 ≈ 0.001157...
    // In mutant: new rewardRate = (350 + 350) + 604800 = 605500 (massively inflated)
    const secondReward = ethers.parseEther("350");
    await staking.connect(owner).notifyRewardAmount(await rewardToken.getAddress(), secondReward);

    // Step 5: Wait remaining time until period finishes
    await ethers.provider.send("evm_increaseTime", [302400]);
    await ethers.provider.send("evm_mine", []);

    // Step 6: Check earned rewards - should be exactly 1050 tokens (100% of rewards since user had all stake)
    // User staked 100 out of 100 total supply, so they get 100% of rewards
    // Total rewards distributed = 700 + 350 = 1050 tokens
    // With original code, user earns 1050 tokens
    // With mutant, user earns massively more due to inflated rate
    const earned = await staking.earned(user.address, await rewardToken.getAddress());

    // If mutant is live, earned will be MUCH larger than 1050 tokens (approximately 605500 * 100 * 302400 / 1e18)
    // We assert that earned equals expected 1050 tokens - this will fail on mutant
    expect(earned).to.equal(ethers.parseEther("1050"));
  });
});