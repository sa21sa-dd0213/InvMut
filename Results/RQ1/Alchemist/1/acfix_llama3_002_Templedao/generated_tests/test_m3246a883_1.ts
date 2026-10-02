import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant m3246a883 - stakeFor zero amount", function () {
  it("should revert when staking 0 tokens in original, but mutant allows it", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    const stakingToken = await ERC20Factory.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    
    // Deploy StaxLPStaking with the staking token and owner as distributor
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();
    
    // Transfer some tokens to addr1 for testing
    await stakingToken.transfer(addr1.address, ethers.parseEther("100"));
    
    // Approve the staking contract to spend addr1's tokens
    await stakingToken.connect(addr1).approve(await instance.getAddress(), ethers.parseEther("100"));
    
    // Try to stake 0 tokens - this should revert in the original contract
    // but the mutant removes the zero-amount check
    await expect(
      instance.connect(addr1).stakeFor(addr1.address, 0)
    ).to.be.revertedWith("Cannot stake 0");
  });
});