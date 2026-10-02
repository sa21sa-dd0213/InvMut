import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant test", function () {
  it("should detect mutant that changes >= to > in _withdrawFor", async function () {
    const [owner, staker] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockERC20.deploy("Staking Token", "STK", 18);
    await stakingToken.waitForDeployment();
    
    // Deploy the StaxLPStaking contract
    const StaxLPStaking = await ethers.getContractFactory("StaxLPStaking");
    const instance = await StaxLPStaking.deploy(
      await stakingToken.getAddress(),
      owner.address
    );
    await instance.waitForDeployment();
    
    // Mint tokens to staker and approve the staking contract
    const stakeAmount = ethers.parseEther("100");
    await stakingToken.mint(staker.address, stakeAmount);
    await stakingToken.connect(staker).approve(
      await instance.getAddress(),
      stakeAmount
    );
    
    // Staker stakes exactly 100 tokens
    await instance.connect(staker).stake(stakeAmount);
    
    // Staker tries to withdraw their entire balance (100 tokens)
    // Original: should succeed (100 >= 100)
    // Mutant: should revert (100 > 100 is false)
    await expect(
      instance.connect(staker).withdraw(stakeAmount, false)
    ).to.not.be.reverted;
    
    // Verify balance is zero after withdrawal
    expect(await instance.balanceOf(staker.address)).to.equal(0);
  });
});