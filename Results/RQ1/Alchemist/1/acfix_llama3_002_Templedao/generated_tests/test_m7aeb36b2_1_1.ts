import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - kill mutant m7a36eb2 (missing Staked event)", function () {
  it("should emit Staked event when staking tokens, killing mutant that removes the event emission", async function () {
    const [owner, staker] = await ethers.getSigners();

    // Deploy a mock ERC20 token for staking
    const MockToken = await ethers.getContractFactory("ERC20Mock");
    const stakingToken = await MockToken.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();

    // Deploy StaxLPStaking with the staking token and owner as reward distributor
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();

    // Give staker some tokens and approve the staking contract
    await stakingToken.transfer(staker.address, ethers.parseEther("1000"));
    await stakingToken.connect(staker).approve(await instance.getAddress(), ethers.parseEther("1000"));

    // Stake tokens and expect the Staked event to be emitted
    const stakeAmount = ethers.parseEther("100");
    await expect(instance.connect(staker).stake(stakeAmount))
      .to.emit(instance, "Staked")
      .withArgs(staker.address, stakeAmount);
  });
});