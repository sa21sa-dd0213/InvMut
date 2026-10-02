import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant m70d1e945 test", function () {
  it("should detect the division vs subtraction mutant in _rewardPerToken", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy a mock ERC20 token for staking and rewards
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockERC20.deploy("Staking Token", "STK", 18);
    await stakingToken.waitForDeployment();

    const rewardToken = await MockERC20.deploy("Reward Token", "RWD", 18);
    await rewardToken.waitForDeployment();

    // Deploy the StaxLPStaking contract
    const StaxLPStaking = await ethers.getContractFactory("StaxLPStaking");
    const staking = await StaxLPStaking.deploy(await stakingToken.getAddress(), owner.address);
    await staking.waitForDeployment();

    // Add reward token
    await staking.addReward(await rewardToken.getAddress());

    // Setup: owner sends reward tokens to distributor (owner is distributor by default)
    const rewardAmount = ethers.parseEther("1000");
    await rewardToken.mint(owner.address, rewardAmount);
    await rewardToken.approve(await staking.getAddress(), rewardAmount);

    // Notify reward - this sets up the reward rate
    await staking.notifyRewardAmount(await rewardToken.getAddress(), rewardAmount);

    // Stake tokens from addr1
    const stakeAmount = ethers.parseEther("100");
    await stakingToken.mint(addr1.address, stakeAmount);
    await stakingToken.connect(addr1).approve(await staking.getAddress(), stakeAmount);
    await staking.connect(addr1).stake(stakeAmount);

    // Fast forward time to accrue some rewards (1 day = 86400 seconds)
    await ethers.provider.send("evm_increaseTime", [86400]);
    await ethers.provider.send("evm_mine", []);

    // Calculate expected rewards manually using original formula:
    // rewardPerToken = rewardPerTokenStored + ((timeDiff * rewardRate * 1e18) / totalSupply)
    const totalSupply = await staking.totalSupply();
    const rewardData = await staking.rewardData(await rewardToken.getAddress());
    const timeDiff = 86400; // 1 day in seconds
    const expectedRewardPerToken = rewardData.rewardPerTokenStored +
      BigInt(timeDiff) * BigInt(rewardData.rewardRate) * BigInt(1e18) / totalSupply;

    // Check rewardPerToken - the mutant will produce a different value
    const actualRewardPerToken = await staking.rewardPerToken(await rewardToken.getAddress());

    // The mutant replaces division with subtraction, producing an incorrect value
    // If the mutation is present, the value will not match the expected calculation
    expect(actualRewardPerToken).to.equal(expectedRewardPerToken);
  });
});