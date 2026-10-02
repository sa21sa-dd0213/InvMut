import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - Kill mutant m547f9019 (_rewardPerToken calculation)", function () {
  let stakingToken: any;
  let rewardToken: any;
  let instance: any;
  let owner: any;
  let user: any;
  let distributor: any;

  beforeEach(async function () {
    [owner, user, distributor] = await ethers.getSigners();

    // Deploy mock ERC20 tokens
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    stakingToken = await ERC20Factory.deploy("Staking Token", "STK", 18);
    await stakingToken.waitForDeployment();
    rewardToken = await ERC20Factory.deploy("Reward Token", "RWD", 18);
    await rewardToken.waitForDeployment();

    // Deploy StaxLPStaking with constructor arguments: _stakingToken, _distributor
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    instance = await Factory.deploy(await stakingToken.getAddress(), distributor.address);
    await instance.waitForDeployment();

    // Setup: Fund user with staking tokens
    await stakingToken.mint(user.address, ethers.parseEther("1000"));
    await stakingToken.connect(user).approve(await instance.getAddress(), ethers.parseEther("1000"));

    // Setup: Fund distributor with reward tokens
    await rewardToken.mint(distributor.address, ethers.parseEther("10000"));
    await rewardToken.connect(distributor).approve(await instance.getAddress(), ethers.parseEther("10000"));

    // Add reward token as owner
    await instance.connect(owner).addReward(await rewardToken.getAddress());
  });

  it("should kill mutant by verifying rewardPerToken calculation after staking and time passes", async function () {
    // Arrange: User stakes tokens
    const stakeAmount = ethers.parseEther("100");
    await instance.connect(user).stake(stakeAmount);

    // Distribute rewards via distributor
    const rewardAmount = ethers.parseEther("1000");
    await instance.connect(distributor).notifyRewardAmount(await rewardToken.getAddress(), rewardAmount);

    // Advance time by half the duration to accumulate rewards
    const duration = 86400 * 7; // 7 days in seconds
    await ethers.provider.send("evm_increaseTime", [duration / 2]);
    await ethers.provider.send("evm_mine", []);

    // Calculate expected reward per token manually
    // expectedRewardPerToken = rewardRate * timeElapsed * 1e18 / totalSupply
    // rewardRate = rewardAmount / DURATION = 1000e18 / 604800
    // timeElapsed = DURATION/2 = 302400
    // totalSupply = 100e18
    const rewardRate = rewardAmount / BigInt(duration);
    const timeElapsed = BigInt(duration / 2);
    const totalSupply = stakeAmount;
    const expectedRewardPerToken = (rewardRate * timeElapsed * ethers.parseEther("1")) / totalSupply;

    // Act: Get actual reward per token from contract
    const actualRewardPerToken = await instance.rewardPerToken(await rewardToken.getAddress());

    // Assert: The mutant should produce a different value (likely 0 or incorrect)
    expect(actualRewardPerToken).to.equal(expectedRewardPerToken);
  });
});