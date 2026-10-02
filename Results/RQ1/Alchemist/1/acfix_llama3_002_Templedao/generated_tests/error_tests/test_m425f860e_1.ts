import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant m425f860e test", function () {
  it("should revert when _getRewards iterates beyond array bounds due to <= operator", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
    const stakingToken = await ERC20Factory.deploy("Staking Token", "STK", 18);
    await stakingToken.waitForDeployment();
    
    // Deploy a mock reward token
    const rewardToken = await ERC20Factory.deploy("Reward Token", "RWD", 18);
    await rewardToken.waitForDeployment();
    
    // Deploy the StaxLPStaking contract
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();
    
    // Add a reward token to the contract
    await instance.addReward(await rewardToken.getAddress());
    
    // Fund addr1 with staking tokens and approve
    const stakeAmount = ethers.parseEther("100");
    await stakingToken.transfer(addr1.address, stakeAmount);
    await stakingToken.connect(addr1).approve(await instance.getAddress(), stakeAmount);
    
    // Have addr1 stake tokens
    await instance.connect(addr1).stake(stakeAmount);
    
    // Now trigger getRewards which calls _getRewards with the mutated loop
    // The mutated loop will try to access rewardTokens[1] when only rewardTokens[0] exists
    // This should cause an out-of-bounds revert on the original but pass on the mutant
    await expect(
      instance.connect(addr1).getRewards(addr1.address)
    ).to.be.reverted;
  });
});