import { expect } from "chai";
import { ethers } from "hardhat";

describe("CVXStaker mutant m24a9c22a", function () {
  it("should kill mutant by testing withdrawAndUnwrap when amount equals clpBalance", async function () {
    const [owner, operator, addr1] = await ethers.getSigners();

    // Deploy mock tokens and booster for testing
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const MockBooster = await ethers.getContractFactory("MockBooster");
    const MockRewardPool = await ethers.getContractFactory("MockRewardPool");

    const clpToken = await MockERC20.deploy("CLP", "CLP", 18);
    await clpToken.waitForDeployment();

    const booster = await MockBooster.deploy();
    await booster.waitForDeployment();

    const rewardPool = await MockRewardPool.deploy();
    await rewardPool.waitForDeployment();

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

    // Setup: set pool info and send CLP tokens to staker
    await staker.connect(owner).setCvxPoolInfo(0, await clpToken.getAddress(), await rewardPool.getAddress());

    // Mint CLP tokens to staker contract
    const stakerAddress = await staker.getAddress();
    await clpToken.mint(stakerAddress, ethers.parseEther("100"));

    // Test the withdrawAndUnwrap function with amount = clpBalance
    await staker.connect(operator).withdrawAndUnwrap(ethers.parseEther("100"), false, addr1.address);
    expect(await clpToken.balanceOf(addr1.address)).to.equal(ethers.parseEther("100"));
  });
});