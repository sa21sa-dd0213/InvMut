import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - Mutant m6273815f (addReward duplicate check removal)", function () {
  it("should revert when adding the same reward token twice in the original contract, but the mutant allows it", async function () {
    const [owner, distributor] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const MockToken = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockToken.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    
    // Deploy a mock ERC20 token for rewards
    const rewardToken = await MockToken.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();
    
    // Deploy the StaxLPStaking contract
    const StaxLPStaking = await ethers.getContractFactory("StaxLPStaking");
    const staking = await StaxLPStaking.deploy(await stakingToken.getAddress(), distributor.address);
    await staking.waitForDeployment();
    
    // First call to addReward should succeed
    await staking.connect(owner).addReward(await rewardToken.getAddress());
    
    // Second call to addReward with the same token should revert in original contract
    // but pass in the mutant (which is the bug we want to detect)
    await expect(
      staking.connect(owner).addReward(await rewardToken.getAddress())
    ).to.be.revertedWith("exists");
  });
});