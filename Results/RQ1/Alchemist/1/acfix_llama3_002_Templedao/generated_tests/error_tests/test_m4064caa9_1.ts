import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant m4064caa9", function () {
  it("should allow partial withdrawal (less than full balance) - kills mutant that requires exact balance", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    const stakingToken = await ERC20Factory.deploy("Staking Token", "STK", ethers.parseEther("1000"));
    await stakingToken.waitForDeployment();
    
    // Deploy the StaxLPStaking contract
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();
    
    // Transfer staking tokens to user
    await stakingToken.transfer(user.address, ethers.parseEther("100"));
    
    // User stakes 100 tokens
    await stakingToken.connect(user).approve(await instance.getAddress(), ethers.parseEther("100"));
    await instance.connect(user).stake(ethers.parseEther("100"));
    
    // Verify user has 100 staked
    expect(await instance.balanceOf(user.address)).to.equal(ethers.parseEther("100"));
    
    // User attempts to withdraw only 50 tokens (partial withdrawal)
    // This should succeed on original contract but fail on mutant (which requires == instead of >=)
    await expect(
      instance.connect(user).withdraw(ethers.parseEther("50"), false)
    ).to.not.be.reverted;
    
    // Verify remaining balance is 50
    expect(await instance.balanceOf(user.address)).to.equal(ethers.parseEther("50"));
  });
});