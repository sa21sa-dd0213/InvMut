import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant m52d12884 test", function () {
  it("should detect mutant by checking periodFinish equals block.timestamp after addReward", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy a mock ERC20 token for staking
    const MockToken = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockToken.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();

    // Deploy a mock ERC20 token for rewards
    const rewardToken = await MockToken.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();

    // Deploy StaxLPStaking with staking token and reward distributor
    const StaxLPStaking = await ethers.getContractFactory("StaxLPStaking");
    const instance = await StaxLPStaking.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();

    // Get current block timestamp
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const timestampBefore = blockBefore!.timestamp;

    // Call addReward
    const tx = await instance.addReward(await rewardToken.getAddress());
    await tx.wait();

    // Get the periodFinish for the reward token
    const periodFinish = await instance.rewardPeriodFinish(await rewardToken.getAddress());

    // Get current block timestamp after transaction
    const blockNumAfter = await ethers.provider.getBlockNumber();
    const blockAfter = await ethers.provider.getBlock(blockNumAfter);
    const timestampAfter = blockAfter!.timestamp;

    // The periodFinish should equal the timestamp when the addReward was called
    // This should be either timestampBefore or timestampAfter depending on when the tx was mined
    // In a test environment, it should match one of these
    const isCorrect = periodFinish === BigInt(timestampBefore) || periodFinish === BigInt(timestampAfter);
    expect(isCorrect).to.be.true;
  });
});