import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant m5be1318d - withdraw zero amount", function () {
  it("should revert when withdrawing 0 tokens, but mutant allows it", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy a mock ERC20 token for staking
    const MockToken = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockToken.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();

    // Deploy StaxLPStaking with required constructor arguments
    const StaxLPStaking = await ethers.getContractFactory("StaxLPStaking");
    const staking = await StaxLPStaking.deploy(await stakingToken.getAddress(), owner.address);
    await staking.waitForDeployment();

    // Mint tokens to user and approve staking contract
    await stakingToken.mint(user.address, ethers.parseEther("100"));
    await stakingToken.connect(user).approve(await staking.getAddress(), ethers.parseEther("100"));

    // User stakes some tokens first
    await staking.connect(user).stake(ethers.parseEther("10"));

    // Attempt to withdraw 0 tokens - should revert in original, passes in mutant
    await expect(
      staking.connect(user).withdraw(0, false)
    ).to.be.revertedWith("Cannot withdraw 0");
  });
});