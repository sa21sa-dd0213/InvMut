import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant mae5d97ab - totalSupply", function () {
  let instance: any;
  let owner: any;
  let addr1: any;
  let stakingToken: any;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();

    // Deploy a mock ERC20 token for staking
    const SimpleToken = await ethers.getContractFactory("SimpleToken");
    stakingToken = await SimpleToken.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();

    // Deploy StaxLPStaking with staking token address and owner as distributor
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    instance = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();

    // Transfer some tokens to addr1 for staking
    await stakingToken.transfer(addr1.address, ethers.parseEther("100"));
  });

  it("should return correct total supply after staking tokens", async function () {
    const stakeAmount = ethers.parseEther("10");

    // Approve and stake tokens from addr1
    await stakingToken.connect(addr1).approve(await instance.getAddress(), stakeAmount);
    await instance.connect(addr1).stake(stakeAmount);

    // Check totalSupply returns the staked amount, not zero
    const totalSupply = await instance.totalSupply();
    expect(totalSupply).to.equal(stakeAmount);
  });
});