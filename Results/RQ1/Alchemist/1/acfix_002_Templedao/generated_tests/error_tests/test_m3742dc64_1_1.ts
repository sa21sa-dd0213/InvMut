import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - balanceOf mutant detection", function () {
  it("should detect mutant that removes return statement from balanceOf", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy a mock ERC20 token for staking
    const MockToken = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockToken.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();

    // Deploy StaxLPStaking with the staking token and owner as distributor
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();

    // Mint tokens to addr1 and approve the staking contract
    const stakeAmount = ethers.parseEther("100");
    await stakingToken.mint(addr1.address, stakeAmount);
    await stakingToken.connect(addr1).approve(await instance.getAddress(), stakeAmount);

    // Stake tokens for addr1
    await instance.connect(addr1).stake(stakeAmount);

    // Check balanceOf - original returns the staked amount, mutant returns 0
    const balance = await instance.balanceOf(addr1.address);

    // If the mutant removed the return statement, balance will be 0 instead of stakeAmount
    expect(balance).to.equal(stakeAmount);
  });
});