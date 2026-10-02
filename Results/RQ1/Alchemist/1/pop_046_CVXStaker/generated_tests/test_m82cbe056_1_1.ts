import { expect } from "chai";
import { ethers } from "hardhat";

describe("CVXStaker mutant m82cbe056 test", function () {
  it("should detect mutant that sets rewardsRecipient to address(this) instead of the parameter", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy mock tokens and contracts needed for CVXStaker constructor
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const clpToken = await MockERC20.deploy("CLP Token", "CLP", ethers.parseEther("1000000"));
    await clpToken.waitForDeployment();

    const rewardToken = await MockERC20.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();

    // Deploy mock booster and reward pool
    const MockBooster = await ethers.getContractFactory("MockBooster");
    const booster = await MockBooster.deploy();
    await booster.waitForDeployment();

    const MockRewardPool = await ethers.getContractFactory("MockRewardPool");
    const rewardPool = await MockRewardPool.deploy(await rewardToken.getAddress(), await clpToken.getAddress());
    await rewardPool.waitForDeployment();

    // Setup booster pool info
    await booster.setPoolInfo(0, {
      lptoken: await clpToken.getAddress(),
      token: await rewardToken.getAddress(),
      gauge: ethers.ZeroAddress,
      crvRewards: await rewardPool.getAddress(),
      stash: ethers.ZeroAddress,
      shutdown: false
    });

    // Deploy CVXStaker
    const rewardTokens = [await rewardToken.getAddress()];
    const CVXStaker = await ethers.getContractFactory("CVXStaker");
    const staker = await CVXStaker.deploy(
      await addr1.getAddress(), // operator
      await clpToken.getAddress(), // clpToken
      await booster.getAddress(), // booster
      rewardTokens // rewardTokens
    );
    await staker.waitForDeployment();

    // Set CVX pool info
    await staker.setCvxPoolInfo(0, await clpToken.getAddress(), await rewardPool.getAddress());

    // Set rewards recipient to addr2 (distinct from contract address)
    await staker.setRewardsRecipient(await addr2.getAddress());

    // Verify rewardsRecipient was set correctly (original behavior)
    const recipient = await staker.rewardsRecipient();

    // In the original, recipient should be addr2
    // In the mutant, recipient would be address(this) - the contract itself
    expect(recipient).to.equal(await addr2.getAddress(), 
      "Mutant detected: rewardsRecipient was set to address(this) instead of the provided parameter");

    // Additional verification: fund the reward pool and simulate rewards
    await rewardToken.transfer(await rewardPool.getAddress(), ethers.parseEther("100"));

    // Set staker as the reward pool's balance holder (simulating staked position)
    await rewardPool.setBalance(await staker.getAddress(), ethers.parseEther("1000"));

    // Call getReward to trigger reward distribution
    await staker.getReward(false);

    // Check that rewards went to addr2, not to the contract itself
    const contractBalance = await rewardToken.balanceOf(await staker.getAddress());
    const addr2Balance = await rewardToken.balanceOf(await addr2.getAddress());

    // Original: rewards go to addr2
    // Mutant: rewards stay in the contract
    expect(addr2Balance).to.be.gt(0, "Mutant detected: rewards not transferred to the intended recipient");
    expect(contractBalance).to.equal(0, "Mutant detected: rewards incorrectly kept in contract");
  });
});