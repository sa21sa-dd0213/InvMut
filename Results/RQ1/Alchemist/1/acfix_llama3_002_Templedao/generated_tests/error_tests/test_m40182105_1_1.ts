import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant detection - m40182105", function () {
  it("should revert when trying to withdraw 0 amount", async function () {
    const [owner, staker] = await ethers.getSigners();

    // Deploy a mock ERC20 token for staking
    const MockToken = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockToken.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();

    // Deploy the StaxLPStaking contract
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();

    // Transfer some tokens to staker and approve
    await stakingToken.transfer(staker.address, ethers.parseEther("1000"));
    await stakingToken.connect(staker).approve(await instance.getAddress(), ethers.parseEther("1000"));

    // Stake some tokens first
    await instance.connect(staker).stake(ethers.parseEther("100"));

    // Attempt to withdraw 0 amount - should revert with "Cannot withdraw 0"
    await expect(
      instance.connect(staker).withdraw(0, false)
    ).to.be.revertedWith("Cannot withdraw 0");
  });
});