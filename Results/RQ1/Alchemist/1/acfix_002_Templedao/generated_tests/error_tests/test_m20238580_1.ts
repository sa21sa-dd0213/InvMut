import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant kill test - m20238580", function () {
  it("should kill mutant by verifying rewardPerToken returns 0 after adding reward token with no rewards", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const MockToken = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockToken.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    
    // Deploy a mock reward token
    const rewardToken = await MockToken.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();
    
    // Deploy the StaxLPStaking contract
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();
    
    // Add reward token
    await instance.addReward(await rewardToken.getAddress());
    
    // Get the block timestamp at the time of adding reward
    const blockNum = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(blockNum);
    
    // Call rewardPerToken - in original, this should be 0 because no rewards have been notified
    // In mutant, block.prevrandao will be used for lastUpdateTime, causing incorrect calculation
    const rewardPerTokenValue = await instance.rewardPerToken(await rewardToken.getAddress());
    
    // In the original contract, rewardPerToken should equal rewardData[token].rewardPerTokenStored
    // which is initialized to 0 and no rewards have been added, so it should be 0
    // The mutant uses block.prevrandao which is a non-zero random value, making this calculation non-zero
    expect(rewardPerTokenValue).to.equal(0);
  });
});