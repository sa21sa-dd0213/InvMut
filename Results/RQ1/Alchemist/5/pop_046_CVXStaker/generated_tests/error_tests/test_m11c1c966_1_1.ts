import { expect } from "chai";
import { ethers } from "hardhat";

describe("CVXStaker mutant m11c1c966 test", function () {
  it("should fail when non-operator tries to call depositAndStake due to constructor bug setting operator to address(this)", async function () {
    const [owner, operator, unauthorized] = await ethers.getSigners();

    // Deploy mock contracts for required constructor parameters
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const clpToken = await MockERC20.deploy("CLP Token", "CLP", ethers.parseEther("1000000"));
    await clpToken.waitForDeployment();

    const MockBooster = await ethers.getContractFactory("MockBooster");
    const booster = await MockBooster.deploy();
    await booster.waitForDeployment();

    const rewardTokens: string[] = [];

    // Deploy CVXStaker with operator as intended
    const CVXStaker = await ethers.getContractFactory("CVXStaker");
    const staker = await CVXStaker.deploy(
      operator.address,
      await clpToken.getAddress(),
      await booster.getAddress(),
      rewardTokens
    );
    await staker.waitForDeployment();

    // Set up pool info so isCvxShutdown() returns false
    await staker.setCvxPoolInfo(0, await clpToken.getAddress(), ethers.ZeroAddress);

    // Provide some CLP tokens to the staker for allowance
    await clpToken.transfer(await staker.getAddress(), ethers.parseEther("100"));

    // Attempt to call depositAndStake from the intended operator
    // In the original contract this should work, but in the mutant it will fail
    // because operator is set to address(this) instead of the passed _operator
    await expect(
      staker.connect(operator).depositAndStake(ethers.parseEther("10"))
    ).to.be.revertedWithCustomError(staker, "NotOperator");

    // Also verify that calling from unauthorized also fails
    await expect(
      staker.connect(unauthorized).depositAndStake(ethers.parseEther("10"))
    ).to.be.revertedWithCustomError(staker, "NotOperator");
  });
});