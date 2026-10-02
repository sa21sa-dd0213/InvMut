import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - Mutant ma58ef563", function () {
    let stakingToken: any;
    let rewardToken: any;
    let staking: any;
    let owner: any;
    let distributor: any;
    let staker: any;

    beforeEach(async function () {
        [owner, distributor, staker] = await ethers.getSigners();

        // Deploy mock ERC20 tokens
        const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
        stakingToken = await ERC20Factory.deploy("Staking Token", "STK", 18);
        await stakingToken.waitForDeployment();

        rewardToken = await ERC20Factory.deploy("Reward Token", "RWD", 18);
        await rewardToken.waitForDeployment();

        // Deploy StaxLPStaking
        const Factory = await ethers.getContractFactory("StaxLPStaking");
        staking = await Factory.deploy(await stakingToken.getAddress(), await distributor.getAddress());
        await staking.waitForDeployment();

        // Add reward token
        await staking.connect(owner).addReward(await rewardToken.getAddress());

        // Setup: mint tokens to staker and approve
        await stakingToken.mint(staker.address, ethers.parseEther("1000"));
        await stakingToken.connect(staker).approve(await staking.getAddress(), ethers.parseEther("1000"));

        // Mint reward tokens to distributor
        await rewardToken.mint(distributor.address, ethers.parseEther("10000"));
        await rewardToken.connect(distributor).approve(await staking.getAddress(), ethers.parseEther("10000"));
    });

    it("should correctly calculate reward rate when notifying reward mid-period (kill mutant ma58ef563)", async function () {
        // First reward period: distribute 7000 tokens over 7 days (1000 per day)
        const firstReward = ethers.parseEther("7000");
        await staking.connect(distributor).notifyRewardAmount(await rewardToken.getAddress(), firstReward);

        // Staker stakes tokens
        await staking.connect(staker).stake(ethers.parseEther("100"));
        
        // Advance time by 3 days (mid-period)
        await ethers.provider.send("evm_increaseTime", [86400 * 3]);
        await ethers.provider.send("evm_mine", []);

        // Second reward notification mid-period: distribute additional 7000 tokens
        const secondReward = ethers.parseEther("7000");
        await staking.connect(distributor).notifyRewardAmount(await rewardToken.getAddress(), secondReward);

        // Get the reward rate after second notification
        const rewardData = await staking.rewardData(await rewardToken.getAddress());
        const rewardRate = rewardData.rewardRate;

        // Calculate expected reward rate in original contract:
        // remaining = periodFinish - block.timestamp = 4 days = 345600 seconds
        // leftover = 345600 * 1000 = 345600000 (original rate was 1000 per second)
        // new rewardRate = (7000e18 + 345600000) / 604800
        // This should be much less than the inflated mutant value

        // Advance time to end of period
        await ethers.provider.send("evm_increaseTime", [86400 * 7]);
        await ethers.provider.send("evm_mine", []);

        // Check staker's earned rewards - should be reasonable
        const earned = await staking.earned(staker.address, await rewardToken.getAddress());

        // In the mutant, the reward rate would be astronomically high due to
        // remaining = periodFinish + block.timestamp instead of periodFinish - block.timestamp
        // This would make earned rewards massively inflated

        // The maximum reasonable reward for 100 tokens over the full period:
        // If rate was 1000 per second (first period), staker gets proportion of total supply
        // Maximum reasonable: around 2000 tokens (100/1000 * 14000 + some leftover)
        expect(earned).to.be.lessThan(ethers.parseEther("5000"));

        // Additionally, the reward rate should not exceed reasonable bounds
        expect(rewardRate).to.be.lessThan(ethers.parseEther("100")); // Reasonable max rate per second
    });
});