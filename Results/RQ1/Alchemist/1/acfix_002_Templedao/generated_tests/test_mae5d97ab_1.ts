import { expect } from "chai";
import { ethers } } from "hardhat";

describe("StaxLPStaking - Mutant mae5d97ab test", function () {
  it("should detect mutant that removes return _totalSupply from totalSupply()", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const MockToken = await ethers.getContractFactory("ERC20Mock");
    const stakingToken = await MockToken.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    
    // Deploy StaxLPStaking with staking token and owner as distributor
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();
    
    // Transfer some tokens to addr1 for staking
    const stakeAmount = ethers.parseEther("100");
    await stakingToken.transfer(addr1.address, stakeAmount);
    
    // Approve staking contract to spend addr1's tokens
    await stakingToken.connect(addr1).approve(await instance.getAddress(), stakeAmount);
    
    // Stake tokens
    await instance.connect(addr1).stake(stakeAmount);
    
    // Call totalSupply - should return stakeAmount, but mutant returns 0
    const totalSupply = await instance.totalSupply();
    
    // Assert that totalSupply is greater than 0 (will fail on mutant returning 0)
    expect(totalSupply).to.equal(stakeAmount);
  });
});