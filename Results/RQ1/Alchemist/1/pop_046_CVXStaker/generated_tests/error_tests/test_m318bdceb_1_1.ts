import { expect } from "chai";
import { ethers } from "hardhat";

describe("CVXStaker mutant m318bdceb test", function () {
  it("should revert when calling withdrawAndUnwrap from unauthorized address", async function () {
    const [owner, operator, unauthorized] = await ethers.getSigners();

    // Deploy mock contracts needed for CVXStaker constructor
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const clpToken = await MockERC20.deploy("CLP Token", "CLP", ethers.parseEther("1000000"));
    await clpToken.waitForDeployment();

    const MockBooster = await ethers.getContractFactory("MockBooster");
    const booster = await MockBooster.deploy();
    await booster.waitForDeployment();

    const rewardTokens: string[] = [];

    // Deploy CVXStaker
    const CVXStaker = await ethers.getContractFactory("CVXStaker");
    const staker = await CVXStaker.deploy(
      operator.address,
      await clpToken.getAddress(),
      await booster.getAddress(),
      rewardTokens
    );
    await staker.waitForDeployment();

    // Setup pool info
    const MockRewardPool = await ethers.getContractFactory("MockRewardPool");
    const rewardPool = await MockRewardPool.deploy();
    await rewardPool.waitForDeployment();

    await staker.connect(owner).setCvxPoolInfo(
      0,
      await clpToken.getAddress(),
      await rewardPool.getAddress()
    );

    // Attempt to call withdrawAndUnwrap from unauthorized address (neither owner nor operator)
    await expect(
      staker.connect(unauthorized).withdrawAndUnwrap(
        ethers.parseEther("100"),
        false,
        unauthorized.address
      )
    ).to.be.revertedWithCustomError(staker, "NotOperatorOrOwner");
  });
});