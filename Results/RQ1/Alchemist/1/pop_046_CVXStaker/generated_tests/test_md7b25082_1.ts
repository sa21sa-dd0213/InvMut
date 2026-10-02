import { expect } from "chai";
import { ethers } from "hardhat";

describe("CVXStaker mutant kill test - md7b25082", function () {
  it("should allow operator to call withdrawAndUnwrap (mutant always reverts)", async function () {
    const [owner, operator, addr1] = await ethers.getSigners();
    
    // Deploy mock CLP token (ERC20)
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const clpToken = await MockERC20.deploy("CLP Token", "CLP", 18);
    await clpToken.waitForDeployment();
    
    // Deploy mock Booster
    const MockBooster = await ethers.getContractFactory("MockBooster");
    const booster = await MockBooster.deploy();
    await booster.waitForDeployment();
    
    // Deploy mock RewardPool
    const MockRewardPool = await ethers.getContractFactory("MockRewardPool");
    const rewardPool = await MockRewardPool.deploy();
    await rewardPool.waitForDeployment();
    
    // Deploy CVXStaker with constructor args
    const CVXStaker = await ethers.getContractFactory("CVXStaker");
    const instance = await CVXStaker.deploy(
      operator.address,
      clpToken.target,
      booster.target,
      [] // empty reward tokens array
    );
    await instance.waitForDeployment();
    
    // Set CVX pool info
    await instance.connect(owner).setCvxPoolInfo(0, clpToken.target, rewardPool.target);
    
    // Transfer some CLP tokens to the staker contract for balance
    await clpToken.mint(instance.target, ethers.parseEther("100"));
    
    // As operator, call withdrawAndUnwrap - this should succeed in original
    // but the mutant changes modifier to `if (true)` causing revert
    await expect(
      instance.connect(operator).withdrawAndUnwrap(
        ethers.parseEther("10"),
        false,
        ethers.ZeroAddress
      )
    ).to.not.be.reverted;
  });
});