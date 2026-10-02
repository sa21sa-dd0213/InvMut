import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant m9b7a45dd detection", function () {
  it("should revert when calling stake with no reward tokens added (kills off-by-one mutant)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockERC20.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    
    // Deploy the StaxLPStaking contract
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();
    
    // Transfer some staking tokens to addr1 for staking
    await stakingToken.transfer(addr1.address, ethers.parseEther("1000"));
    
    // Approve the staking contract to spend tokens
    await stakingToken.connect(addr1).approve(await instance.getAddress(), ethers.parseEther("1000"));
    
    // Attempt to stake - this should revert in the mutant due to out-of-bounds access
    // in the updateReward modifier loop when rewardTokens array is empty
    await expect(
      instance.connect(addr1).stake(ethers.parseEther("100"))
    ).to.be.reverted;
  });
});