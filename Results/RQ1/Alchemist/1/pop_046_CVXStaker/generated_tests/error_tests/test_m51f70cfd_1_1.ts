import { expect } from "chai";
import { ethers } from "hardhat";

describe("CVXStaker mutant m51f70cfd test", function () {
  it("should revert when withdrawAndUnwrap is called from unauthorized address", async function () {
    const [owner, operator, unauthorized] = await ethers.getSigners();

    // Deploy mock tokens and booster for testing
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const clpToken = await MockERC20.deploy("CLP Token", "CLP", ethers.parseEther("1000"));
    await clpToken.waitForDeployment();

    const MockBooster = await ethers.getContractFactory("MockBooster");
    const booster = await MockBooster.deploy();
    await booster.waitForDeployment();

    const rewardTokens: string[] = [];

    // Deploy CVXStaker with required constructor arguments
    const CVXStaker = await ethers.getContractFactory("CVXStaker");
    const staker = await CVXStaker.deploy(
      operator.address,
      await clpToken.getAddress(),
      await booster.getAddress(),
      rewardTokens
    );
    await staker.waitForDeployment();

    // Setup pool info via owner
    await staker.setCvxPoolInfo(0, await clpToken.getAddress(), ethers.ZeroAddress);

    // Attempt to call withdrawAndUnwrap from unauthorized address
    await expect(
      staker.connect(unauthorized).withdrawAndUnwrap(
        ethers.parseEther("100"),
        false,
        ethers.ZeroAddress
      )
    ).to.be.revertedWithCustomError(staker, "NotOperatorOrOwner");
  });
});