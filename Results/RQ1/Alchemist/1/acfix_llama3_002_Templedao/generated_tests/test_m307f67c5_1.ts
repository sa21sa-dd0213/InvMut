import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - kill mutant m307f67c5", function () {
  it("should succeed when calling notifyRewardAmount with a valid positive amount, but mutant with < 0 check will revert", async function () {
    const [owner, distributor] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const MockToken = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockToken.deploy("Staking Token", "STK");
    await stakingToken.waitForDeployment();
    
    // Deploy a reward token
    const rewardToken = await MockToken.deploy("Reward Token", "RWD");
    await rewardToken.waitForDeployment();
    
    // Deploy StaxLPStaking with staking token and distributor address
    const StaxLPStaking = await ethers.getContractFactory("StaxLPStaking");
    const instance = await StaxLPStaking.deploy(
      await stakingToken.getAddress(),
      distributor.address
    );
    await instance.waitForDeployment();
    
    // Add reward token to the staking contract
    await instance.connect(owner).addReward(await rewardToken.getAddress());
    
    // Fund distributor with reward tokens
    const rewardAmount = ethers.parseEther("1000");
    await rewardToken.mint(distributor.address, rewardAmount);
    await rewardToken.connect(distributor).approve(await instance.getAddress(), rewardAmount);
    
    // Call notifyRewardAmount with a positive amount
    // In the original contract: require(_amount > 0, "No reward") will pass
    // In the mutant: require(_amount < 0, "No reward") will always revert since uint256 cannot be negative
    await expect(
      instance.connect(distributor).notifyRewardAmount(
        await rewardToken.getAddress(),
        rewardAmount
      )
    ).to.not.be.reverted;
  });
});