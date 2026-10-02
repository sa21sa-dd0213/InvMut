import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant kill test - m7caff0e9", function () {
  it("should revert when staking 0 tokens (mutant removes this check)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const MockToken = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockToken.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    
    // Deploy StaxLPStaking with the staking token and owner as distributor
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();
    
    // Transfer some tokens to addr1 for testing
    await stakingToken.transfer(addr1.address, ethers.parseEther("100"));
    
    // Approve the staking contract to spend addr1's tokens
    await stakingToken.connect(addr1).approve(await instance.getAddress(), ethers.parseEther("100"));
    
    // Attempt to stake 0 tokens - should revert in original, but mutant allows it
    await expect(
      instance.connect(addr1).stakeFor(addr1.address, 0)
    ).to.be.revertedWith("Cannot stake 0");
  });
});