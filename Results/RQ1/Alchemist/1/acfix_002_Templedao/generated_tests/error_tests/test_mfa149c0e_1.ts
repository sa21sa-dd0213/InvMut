import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant kill test - mfa149c0e", function () {
  it("should revert when adding a new reward token on the mutant but pass on original", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockERC20.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    
    // Deploy a mock ERC20 token for rewards
    const rewardToken = await MockERC20.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();
    
    // Deploy the StaxLPStaking contract
    const StaxLPStaking = await ethers.getContractFactory("StaxLPStaking");
    const instance = await StaxLPStaking.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();
    
    // Attempt to add a new reward token (which should have lastUpdateTime == 0 initially)
    // The mutant requires lastUpdateTime != 0, so this should revert on the mutant
    // but succeed on the original
    await expect(
      instance.addReward(await rewardToken.getAddress())
    ).to.be.revertedWith("exists");
  });
});