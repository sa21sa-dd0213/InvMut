import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - kill mutant m72aa6137", function () {
  it("should kill mutant by calling rewardPerToken when totalSupply is zero", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockERC20.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    
    // Deploy a mock reward token
    const rewardToken = await MockERC20.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();
    
    // Deploy StaxLPStaking with staking token and owner as distributor
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();
    
    // Add reward token
    await instance.addReward(await rewardToken.getAddress());
    
    // Verify totalSupply is 0 (no one has staked)
    expect(await instance.totalSupply()).to.equal(0);
    
    // Call rewardPerToken - should NOT revert on original (returns stored value)
    // On mutant with != condition, it will attempt division by zero and revert
    await expect(
      instance.rewardPerToken(await rewardToken.getAddress())
    ).to.not.be.reverted;
  });
});