import { expect } from "chai";
import { ethers } } from "hardhat";

describe("CVXStaker mutant kill test - withdrawAndUnwrap arithmetic mutation", function () {
  it("should revert when withdrawing more than balance due to incorrect addition in toUnstake calculation", async function () {
    const [owner, operator, addr1] = await ethers.getSigners();
    
    // Deploy mock ERC20 for clpToken
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    const clpToken = await ERC20Factory.deploy("CLP Token", "CLP", ethers.parseEther("1000000"));
    await clpToken.waitForDeployment();
    
    // Deploy mock Booster
    const BoosterFactory = await ethers.getContractFactory("MockBooster");
    const booster = await BoosterFactory.deploy();
    await booster.waitForDeployment();
    
    // Deploy mock RewardPool
    const RewardPoolFactory = await ethers.getContractFactory("MockRewardPool");
    const rewardPool = await RewardPoolFactory.deploy(await clpToken.getAddress());
    await rewardPool.waitForDeployment();
    
    // Setup reward tokens array
    const rewardTokens: string[] = [];
    
    // Deploy CVXStaker
    const CVXStakerFactory = await ethers.getContractFactory("CVXStaker");
    const staker = await CVXStakerFactory.deploy(
      operator.address,
      await clpToken.getAddress(),
      await booster.getAddress(),
      rewardTokens
    );
    await staker.waitForDeployment();
    
    // Setup pool info
    const pId = 0;
    await booster.setPoolInfo(pId, await clpToken.getAddress(), await rewardPool.getAddress());
    await staker.setCvxPoolInfo(pId, await clpToken.getAddress(), await rewardPool.getAddress());
    
    // Set operator
    await staker.setOperator(operator.address);
    
    // Fund staker with some CLP tokens (e.g., 100 tokens)
    const initialBalance = ethers.parseEther("100");
    await clpToken.transfer(await staker.getAddress(), initialBalance);
    
    // Simulate staking some tokens in reward pool (e.g., 50 tokens staked)
    await rewardPool.stakeFor(await staker.getAddress(), ethers.parseEther("50"));
    
    // Now attempt to withdraw 120 tokens when only 100 are in contract and 50 staked
    // Original: toUnstake = 120 - 100 = 20 (reasonable)
    // Mutant: toUnstake = 120 + 100 = 220 (exceeds staked 50, will revert)
    await expect(
      staker.connect(operator).withdrawAndUnwrap(
        ethers.parseEther("120"),
        false,
        addr1.address
      )
    ).to.be.reverted;
  });
});