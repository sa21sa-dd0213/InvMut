import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant kill test - RewardAdded event", function () {
  it("should emit RewardAdded event when notifyRewardAmount is called by reward distributor", async function () {
    const [owner, distributor, staker] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const MockTokenFactory = await ethers.getContractFactory("IERC20");
    // Using a simple ERC20 implementation for testing
    const SimpleERC20 = await ethers.getContractFactory("contracts/test/SimpleERC20.sol:SimpleERC20");
    const stakingToken = await SimpleERC20.deploy("Staking Token", "STK", 18);
    await stakingToken.waitForDeployment();
    
    // Deploy reward token
    const rewardToken = await SimpleERC20.deploy("Reward Token", "RWD", 18);
    await rewardToken.waitForDeployment();
    
    // Deploy StaxLPStaking with staking token and distributor
    const StaxLPStakingFactory = await ethers.getContractFactory("StaxLPStaking");
    const staking = await StaxLPStakingFactory.deploy(
      await stakingToken.getAddress(),
      await distributor.getAddress()
    );
    await staking.waitForDeployment();
    
    // Owner adds reward token
    await staking.connect(owner).addReward(await rewardToken.getAddress());
    
    // Fund distributor with reward tokens
    const rewardAmount = ethers.parseEther("1000");
    await rewardToken.mint(await distributor.getAddress(), rewardAmount);
    await rewardToken.connect(distributor).approve(await staking.getAddress(), rewardAmount);
    
    // Call notifyRewardAmount from distributor and check for event emission
    const tx = await staking.connect(distributor).notifyRewardAmount(
      await rewardToken.getAddress(),
      rewardAmount
    );
    
    // Verify the RewardAdded event was emitted with correct parameters
    await expect(tx)
      .to.emit(staking, "RewardAdded")
      .withArgs(await rewardToken.getAddress(), rewardAmount);
  });
});