import { expect } from "chai";
import { ethers } from "hardhat";

describe("CVXStaker mutant m6dbd9b5b - withdrawAllAndUnwrap access control", function () {
  it("should revert when non-owner calls withdrawAllAndUnwrap", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy mock contracts for constructor arguments
    const CLPToken = await ethers.getContractFactory("MockERC20");
    const clpToken = await CLPToken.deploy("CLP", "CLP");
    await clpToken.waitForDeployment();

    const Booster = await ethers.getContractFactory("MockBooster");
    const booster = await Booster.deploy();
    await booster.waitForDeployment();

    const rewardTokens: string[] = [];

    // Deploy CVXStaker with required constructor arguments
    const CVXStaker = await ethers.getContractFactory("CVXStaker");
    const instance = await CVXStaker.deploy(
      owner.address,
      await clpToken.getAddress(),
      await booster.getAddress(),
      rewardTokens
    );
    await instance.waitForDeployment();

    // Setup CVX pool info (required for function to work)
    await instance.setCvxPoolInfo(0, await clpToken.getAddress(), ethers.ZeroAddress);

    // Attempt to call withdrawAllAndUnwrap from non-owner address
    await expect(
      instance.connect(addr1).withdrawAllAndUnwrap(false, false)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });
});