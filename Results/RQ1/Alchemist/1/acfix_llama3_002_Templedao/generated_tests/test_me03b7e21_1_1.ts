import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant test - me03b7e21", function () {
  it("should succeed with valid positive amount, but mutant will revert", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy a mock ERC20 token for staking
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockERC20.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();

    // Deploy StaxLPStaking with the staking token and owner as distributor
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();

    // Transfer some tokens to user for staking
    const stakeAmount = ethers.parseEther("100");
    await stakingToken.transfer(user.address, stakeAmount);

    // User approves the staking contract
    await stakingToken.connect(user).approve(await instance.getAddress(), stakeAmount);

    // Call stakeFor with a valid positive amount - should succeed in original, revert in mutant
    await expect(instance.connect(user).stakeFor(user.address, stakeAmount)).to.not.be.reverted;

    // Verify the user's balance increased
    expect(await instance.balanceOf(user.address)).to.equal(stakeAmount);
    expect(await instance.totalSupply()).to.equal(stakeAmount);
  });
});