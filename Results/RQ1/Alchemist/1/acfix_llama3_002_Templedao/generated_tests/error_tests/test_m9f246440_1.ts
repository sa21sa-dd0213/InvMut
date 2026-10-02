import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - Kill mutant m9f246440 (notifyRewardAmount access control)", function () {
  it("should revert when called by the rewardDistributor after mutation (inverted access control)", async function () {
    const [owner, distributor, unauthorized] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking and rewards
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockERC20.deploy("Staking Token", "STK", 18);
    await stakingToken.waitForDeployment();
    
    const rewardToken = await MockERC20.deploy("Reward Token", "RWD", 18);
    await rewardToken.waitForDeployment();
    
    // Deploy StaxLPStaking with stakingToken and distributor address
    const StaxLPStaking = await ethers.getContractFactory("StaxLPStaking");
    const staking = await StaxLPStaking.deploy(
      await stakingToken.getAddress(),
      distributor.address
    );
    await staking.waitForDeployment();
    
    // Add reward token (onlyOwner)
    await staking.connect(owner).addReward(await rewardToken.getAddress());
    
    // Fund reward token to distributor for notifyRewardAmount
    const rewardAmount = ethers.parseEther("1000");
    await rewardToken.mint(distributor.address, rewardAmount);
    await rewardToken.connect(distributor).approve(await staking.getAddress(), rewardAmount);
    
    // The mutant changes require(msg.sender == rewardDistributor) to require(msg.sender != rewardDistributor)
    // So when the legitimate distributor calls notifyRewardAmount, it should REVERT in the mutant
    // but PASS in the original. We expect revert to kill the mutant.
    await expect(
      staking.connect(distributor).notifyRewardAmount(
        await rewardToken.getAddress(),
        rewardAmount
      )
    ).to.be.revertedWith("not distributor");
  });
});