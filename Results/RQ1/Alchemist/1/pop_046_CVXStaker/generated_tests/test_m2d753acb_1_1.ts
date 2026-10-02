import { expect } from "chai";
import { ethers } from "hardhat";

describe("CVXStaker mutant m2d753acb test", function () {
  it("should revert or keep tokens when sendToOperator is false in withdrawAllAndUnwrap", async function () {
    const [owner, operator, addr1] = await ethers.getSigners();

    // Deploy mock contracts for testing
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const clpToken = await MockERC20.deploy("CLP Token", "CLP", 18);
    await clpToken.waitForDeployment();

    const MockBooster = await ethers.getContractFactory("MockBooster");
    const booster = await MockBooster.deploy();
    await booster.waitForDeployment();

    const MockRewardPool = await ethers.getContractFactory("MockRewardPool");
    const rewardPool = await MockRewardPool.deploy();
    await rewardPool.waitForDeployment();

    // Deploy CVXStaker with constructor arguments
    const rewardTokens: string[] = [];
    const Factory = await ethers.getContractFactory("CVXStaker");
    const instance = await Factory.deploy(
      operator.address,
      clpToken.target,
      booster.target,
      rewardTokens
    );
    await instance.waitForDeployment();

    // Setup: Set pool info and transfer some CLP tokens to the contract
    await instance.setCvxPoolInfo(1, clpToken.target, rewardPool.target);

    // Mint CLP tokens to the contract and simulate staking
    const initialBalance = ethers.parseEther("100");
    await clpToken.mint(instance.target, initialBalance);

    // Call withdrawAllAndUnwrap with sendToOperator = false
    const tx = await instance.connect(owner).withdrawAllAndUnwrap(false, false);
    await tx.wait();

    // Check that tokens are NOT transferred to operator when sendToOperator is false
    const operatorBalance = await clpToken.balanceOf(operator.address);
    const contractBalance = await clpToken.balanceOf(instance.target);

    // In the original contract, when sendToOperator is false, tokens should remain in the contract
    // In the mutant, tokens would be incorrectly sent to operator
    expect(operatorBalance).to.equal(0);
    expect(contractBalance).to.equal(initialBalance);
  });
});