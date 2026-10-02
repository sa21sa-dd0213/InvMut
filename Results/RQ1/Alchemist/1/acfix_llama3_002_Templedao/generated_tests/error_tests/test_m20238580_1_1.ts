import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant m20238580 test", function () {
  it("should kill mutant that uses block.prevrandao instead of block.timestamp in addReward", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy a mock ERC20 token for staking
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockERC20.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();

    // Deploy another ERC20 token for rewards
    const rewardToken = await MockERC20.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();

    // Deploy the StaxLPStaking contract
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();

    // Get the current block timestamp
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const timestampBefore = blockBefore!.timestamp;

    // Add reward token
    const tx = await instance.addReward(await rewardToken.getAddress());
    const receipt = await tx.wait();

    // Get the block where the transaction was mined
    const blockNumAfter = receipt!.blockNumber;
    const blockAfter = await ethers.provider.getBlock(blockNumAfter);
    const timestampAfter = blockAfter!.timestamp;

    // Get the stored lastUpdateTime and periodFinish
    const rewardData = await instance.rewardData(await rewardToken.getAddress());
    const storedLastUpdateTime = rewardData.lastUpdateTime;
    const storedPeriodFinish = rewardData.periodFinish;

    // In the original contract, lastUpdateTime and periodFinish should be set to block.timestamp
    // which should be close to the actual block timestamp
    // In the mutant, they would be set to block.prevrandao which is a random value

    // Assert that stored values are close to the actual block timestamp
    // This should pass on original but fail on mutant because prevrandao is random
    expect(storedLastUpdateTime).to.be.closeTo(timestampAfter, 1);
    expect(storedPeriodFinish).to.be.closeTo(timestampAfter, 1);

    // Additional assertion: block.prevrandao is a random 256-bit value, so if the mutant was used
    // the stored values would be astronomically larger than any reasonable timestamp
    expect(storedLastUpdateTime).to.be.lessThan(blockAfter!.timestamp + 100);
    expect(storedPeriodFinish).to.be.lessThan(blockAfter!.timestamp + 100);
  });
});