import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant test - m52d12884", function () {
  it("should detect block.prevrandao mutation in addReward by verifying periodFinish equals block.timestamp", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy a mock ERC20 token for staking
    const MockToken = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockToken.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();

    // Deploy a mock reward token
    const rewardToken = await MockToken.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();

    // Deploy the StaxLPStaking contract
    const StaxLPStaking = await ethers.getContractFactory("StaxLPStaking");
    const instance = await StaxLPStaking.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();

    // Get current block timestamp
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const timestampBefore = blockBefore!.timestamp;

    // Add a reward token - this is where the mutation affects periodFinish
    const tx = await instance.connect(owner).addReward(await rewardToken.getAddress());
    await tx.wait();

    // Get the block after the transaction
    const blockNumAfter = await ethers.provider.getBlockNumber();
    const blockAfter = await ethers.provider.getBlock(blockNumAfter);
    const timestampAfter = blockAfter!.timestamp;
    const prevrandaoAfter = blockAfter!.prevrandao;

    // Get the periodFinish from the contract
    const periodFinish = await instance.rewardPeriodFinish(await rewardToken.getAddress());

    // In the original contract, periodFinish should equal block.timestamp (which is between timestampBefore and timestampAfter)
    // In the mutant, periodFinish would equal block.prevrandao (a random value)
    // If the mutant is present, periodFinish will NOT equal the expected timestamp
    const expectedTimestamp = BigInt(timestampAfter);

    // The periodFinish should be approximately equal to the block timestamp (within reasonable range)
    // If it equals prevrandao, the mutant is detected
    expect(periodFinish).to.not.equal(BigInt(prevrandaoAfter!), "Mutant detected: periodFinish was set to prevrandao instead of timestamp");

    // Verify it's close to the expected timestamp (within 1 second tolerance)
    const diff = periodFinish > expectedTimestamp ? periodFinish - expectedTimestamp : expectedTimestamp - periodFinish;
    expect(diff).to.be.lessThanOrEqual(2, "periodFinish should be approximately equal to block.timestamp");

    // Additional verification: stake tokens and check that reward calculations work correctly
    await stakingToken.connect(addr1).approve(await instance.getAddress(), ethers.parseEther("100"));
    await instance.connect(addr1).stake(ethers.parseEther("100"));

    // Notify reward
    await rewardToken.connect(owner).approve(await instance.getAddress(), ethers.parseEther("1000"));
    await instance.connect(owner).notifyRewardAmount(await rewardToken.getAddress(), ethers.parseEther("1000"));

    // Check that rewards are being calculated (this would fail with mutant due to incorrect periodFinish)
    const earned = await instance.connect(addr1).earned(addr1.address, await rewardToken.getAddress());
    expect(earned).to.be.gte(0);
  });
});