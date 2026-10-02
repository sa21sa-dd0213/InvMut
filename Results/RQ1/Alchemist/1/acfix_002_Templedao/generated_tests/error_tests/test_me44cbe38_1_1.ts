import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant test for me44cbe38", function () {
  it("should kill mutant by withdrawing less than staked balance (original passes, mutant reverts)", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy a mock ERC20 token for staking
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockERC20.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();

    // Deploy StaxLPStaking with staking token and owner as reward distributor
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();

    // Transfer staking tokens to user
    await stakingToken.transfer(user.address, ethers.parseEther("200"));

    // User stakes 100 tokens
    await stakingToken.connect(user).approve(await instance.getAddress(), ethers.parseEther("100"));
    await instance.connect(user).stake(ethers.parseEther("100"));

    // User attempts to withdraw 50 tokens (less than staked balance of 100)
    // Original: should succeed because 100 >= 50
    // Mutant: should revert because 100 <= 50 is false
    await expect(
      instance.connect(user).withdraw(ethers.parseEther("50"), false)
    ).to.be.revertedWith("Not enough staked tokens");
  });
});