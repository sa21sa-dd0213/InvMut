import { expect } from "chai";
import { ethers } from "hardhat";

describe("CVXStaker mutant test - onlyOperator modifier", function () {
  it("should revert when non-operator calls depositAndStake due to onlyOperator modifier", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy mock contracts for constructor arguments
    const CLPTokenFactory = await ethers.getContractFactory("ERC20Mock");
    const clpToken = await CLPTokenFactory.deploy("CLP Token", "CLP");
    await clpToken.waitForDeployment();

    const BoosterFactory = await ethers.getContractFactory("BoosterMock");
    const booster = await BoosterFactory.deploy();
    await booster.waitForDeployment();

    const rewardTokens: string[] = [];

    // Deploy CVXStaker
    const CVXStakerFactory = await ethers.getContractFactory("CVXStaker");
    const cvxStaker = await CVXStakerFactory.deploy(
      addr1.address, // operator
      await clpToken.getAddress(),
      await booster.getAddress(),
      rewardTokens
    );
    await cvxStaker.waitForDeployment();

    // Set cvxPoolInfo so depositAndStake can proceed (need pool info to exist)
    await cvxStaker.connect(owner).setCvxPoolInfo(0, await clpToken.getAddress(), ethers.ZeroAddress);

    // Try to call depositAndStake from unauthorized address (addr2)
    await expect(
      cvxStaker.connect(addr2).depositAndStake(ethers.parseEther("100"))
    ).to.be.revertedWithCustomError(cvxStaker, "NotOperator");
  });
});