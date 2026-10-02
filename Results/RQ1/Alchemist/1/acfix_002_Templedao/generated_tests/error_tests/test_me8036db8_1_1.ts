import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - Kill mutant me8036db8", function () {
  it("should revert when withdrawing exact balance on mutant (balance > amount instead of >=)", async function () {
    const [owner, staker] = await ethers.getSigners();

    // Deploy a mock ERC20 token for staking
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockERC20.deploy("Staking Token", "STK", ethers.parseEther("1000"));
    await stakingToken.waitForDeployment();

    // Deploy StaxLPStaking with constructor args: stakingToken address, rewardDistributor (owner)
    const StaxLPStaking = await ethers.getContractFactory("StaxLPStaking");
    const instance = await StaxLPStaking.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();

    const stakingAmount = ethers.parseEther("100");

    // Transfer staking tokens to staker
    await stakingToken.transfer(staker.address, stakingAmount);

    // Approve staking contract to spend staker's tokens
    await stakingToken.connect(staker).approve(await instance.getAddress(), stakingAmount);

    // Staker stakes exactly 100 tokens
    await instance.connect(staker).stake(stakingAmount);

    // Verify balance is exactly 100
    expect(await instance.balanceOf(staker.address)).to.equal(stakingAmount);

    // Attempt to withdraw the exact same amount (entire balance)
    // On original: should succeed (balance >= amount)
    // On mutant: should revert (balance > amount fails because 100 > 100 is false)
    await expect(
      instance.connect(staker).withdraw(stakingAmount, false)
    ).to.be.revertedWith("Not enough staked tokens");
  });
});