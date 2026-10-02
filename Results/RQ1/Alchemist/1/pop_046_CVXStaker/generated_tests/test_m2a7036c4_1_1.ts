import { expect } from "chai";
import { ethers } from "hardhat";

describe("CVXStaker - kill mutant m2a7036c4 (missing SetOperator event)", function () {
  it("should emit SetOperator event when setOperator is called", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy mock contracts for constructor arguments
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const clpToken = await MockERC20.deploy("CLP Token", "CLP");
    await clpToken.waitForDeployment();

    const MockBooster = await ethers.getContractFactory("MockBooster");
    const booster = await MockBooster.deploy();
    await booster.waitForDeployment();

    const rewardTokens: string[] = [];

    // Deploy CVXStaker with required constructor arguments
    const CVXStakerFactory = await ethers.getContractFactory("CVXStaker");
    const cvxStaker = await CVXStakerFactory.deploy(
      addr1.address,
      await clpToken.getAddress(),
      await booster.getAddress(),
      rewardTokens
    );
    await cvxStaker.waitForDeployment();

    // Call setOperator and check for SetOperator event
    const newOperator = addr2.address;
    const tx = await cvxStaker.connect(owner).setOperator(newOperator);
    await tx.wait();

    // Check that SetOperator event was emitted with the correct parameters
    await expect(tx)
      .to.emit(cvxStaker, "SetOperator")
      .withArgs(newOperator);
  });
});