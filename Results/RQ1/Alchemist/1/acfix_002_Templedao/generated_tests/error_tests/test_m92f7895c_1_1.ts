import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - Mutant m92f7895c (remove balance check in _withdrawFor)", function () {
  it("should revert when withdrawing more than staked balance (mutant removes the require)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockERC20.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    
    // Deploy the StaxLPStaking contract
    const StaxLPStaking = await ethers.getContractFactory("StaxLPStaking");
    const instance = await StaxLPStaking.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();
    
    // Transfer some tokens to addr1 for staking
    await stakingToken.transfer(addr1.address, ethers.parseEther("100"));
    
    // addr1 stakes 10 tokens
    await stakingToken.connect(addr1).approve(await instance.getAddress(), ethers.parseEther("100"));
    await instance.connect(addr1).stake(ethers.parseEther("10"));
    
    // Attempt to withdraw 20 tokens (more than staked balance of 10)
    await expect(
      instance.connect(addr1).withdraw(ethers.parseEther("20"), false)
    ).to.be.revertedWith("Not enough staked tokens");
  });
});