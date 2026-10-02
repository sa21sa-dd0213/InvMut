import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant test - Withdrawn event emission", function () {
  it("should emit Withdrawn event when withdrawing tokens", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockERC20.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    
    // Deploy StaxLPStaking
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();
    
    // Transfer some tokens to addr1 for staking
    await stakingToken.transfer(addr1.address, ethers.parseEther("1000"));
    
    // Stake tokens first
    await stakingToken.connect(addr1).approve(await instance.getAddress(), ethers.parseEther("500"));
    await instance.connect(addr1).stake(ethers.parseEther("500"));
    
    // Now withdraw and check for Withdrawn event
    const tx = await instance.connect(addr1).withdraw(ethers.parseEther("200"), false);
    const receipt = await tx.wait();
    
    // Verify Withdrawn event was emitted
    await expect(tx)
      .to.emit(instance, "Withdrawn")
      .withArgs(addr1.address, addr1.address, ethers.parseEther("200"));
  });
});