import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - Kill mutant m3246a883 (remove zero amount check in stakeFor)", function () {
  it("should revert when staking with amount 0 on original, but mutant would allow it", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const MockToken = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockToken.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    
    // Deploy StaxLPStaking with the staking token and distributor
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();
    
    // Transfer some tokens to addr1 for testing
    await stakingToken.transfer(addr1.address, ethers.parseEther("1000"));
    
    // Approve the staking contract to spend addr1's tokens
    await stakingToken.connect(addr1).approve(await instance.getAddress(), ethers.parseEther("1000"));
    
    // Attempt to stake 0 tokens - this should revert on the original contract
    // The mutant removed the require(_amount > 0, "Cannot stake 0") check
    await expect(
      instance.connect(addr1).stakeFor(addr1.address, 0)
    ).to.be.revertedWith("Cannot stake 0");
    
    // Verify that no tokens were staked (balance should still be 0)
    expect(await instance.balanceOf(addr1.address)).to.equal(0);
    expect(await instance.totalSupply()).to.equal(0);
  });
});