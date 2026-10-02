import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant m3742dc64 - balanceOf", function () {
  it("should detect mutant that removes balanceOf return by checking balance after staking", async function () {
    const [owner, staker] = await ethers.getSigners();

    // Deploy a mock ERC20 token for staking
    const ERC20Factory = await ethers.getContractFactory("contracts/mocks/ERC20Mock.sol:ERC20Mock");
    const stakingToken = await ERC20Factory.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();

    // Deploy the StaxLPStaking contract
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();

    // Transfer staking tokens to staker
    await stakingToken.transfer(staker.address, ethers.parseEther("100"));

    // Staker approves and stakes tokens
    await stakingToken.connect(staker).approve(await instance.getAddress(), ethers.parseEther("50"));
    await instance.connect(staker).stake(ethers.parseEther("50"));

    // Check balanceOf - should return 50 ether worth of staked tokens
    // The mutant would return 0 instead of the actual balance
    const balance = await instance.connect(staker).balanceOf(staker.address);
    expect(balance).to.equal(ethers.parseEther("50"));
  });
});