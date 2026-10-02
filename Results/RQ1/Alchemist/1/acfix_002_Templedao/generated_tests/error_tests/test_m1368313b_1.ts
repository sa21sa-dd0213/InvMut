import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - Kill mutant m1368313b (false instead of amount > 0)", function () {
  let stakingToken: any;
  let rewardToken: any;
  let staking: any;
  let owner: any;
  let user: any;
  let distributor: any;

  beforeEach(async function () {
    [owner, user, distributor] = await ethers.getSigners();

    // Deploy mock ERC20 tokens
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    stakingToken = await ERC20Factory.deploy("Staking Token", "STK");
    await stakingToken.waitForDeployment();
    rewardToken = await ERC20Factory.deploy("Reward Token", "RWD");
    await rewardToken.waitForDeployment();

    // Deploy StaxLPStaking with staking token and distributor
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    staking = await Factory.deploy(await stakingToken.getAddress(), distributor.address);
    await staking.waitForDeployment();

    // Set reward distributor
    await staking.connect(owner).setRewardDistributor(distributor.address);

    // Add reward token
    await staking.connect(owner).addReward(await rewardToken.getAddress());

    // Mint tokens to user and approve
    await stakingToken.mint(user.address, ethers.parseEther("1000"));
    await stakingToken.connect(user).approve(await staking.getAddress(), ethers.parseEther("1000"));

    // Mint reward tokens to distributor and approve
    await rewardToken.mint(distributor.address, ethers.parseEther("1000"));
    await rewardToken.connect(distributor).approve(await staking.getAddress(), ethers.parseEther("1000"));
  });

  it("should claim rewards after staking and verify balance increase", async function () {
    // User stakes 100 tokens
    await staking.connect(user).stake(ethers.parseEther("100"));

    // Distributor notifies reward of 100 reward tokens over 1 week
    await staking.connect(distributor).notifyRewardAmount(
      await rewardToken.getAddress(),
      ethers.parseEther("100")
    );

    // Fast forward 3 days to accumulate rewards
    await ethers.provider.send("evm_increaseTime", [86400 * 3]);
    await ethers.provider.send("evm_mine", []);

    // Get user's reward token balance before claiming
    const balanceBefore = await rewardToken.balanceOf(user.address);

    // User claims rewards
    await staking.connect(user).getRewards(user.address);

    // Get user's reward token balance after claiming
    const balanceAfter = await rewardToken.balanceOf(user.address);

    // In the original contract, balanceAfter should be > balanceBefore
    // In the mutant, the reward transfer never happens because amount > 0 is replaced with false
    // So balanceAfter should equal balanceBefore (mutant killed)
    expect(balanceAfter).to.be.gt(balanceBefore);
  });
});