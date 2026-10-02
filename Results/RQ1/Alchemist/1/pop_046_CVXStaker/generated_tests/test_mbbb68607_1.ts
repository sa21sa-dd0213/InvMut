import { expect } from "chai";
import { ethers } from "hardhat";

describe("CVXStaker mutant kill test - onlyOperator modifier", function () {
  it("should revert when non-operator calls depositAndStake but succeed when operator calls it", async function () {
    const [owner, operator, nonOperator] = await ethers.getSigners();
    
    // Deploy mock contracts for constructor arguments
    const MockToken = await ethers.getContractFactory("MockERC20");
    const clpToken = await MockToken.deploy("CLP Token", "CLP");
    await clpToken.waitForDeployment();
    
    const MockBooster = await ethers.getContractFactory("MockBooster");
    const booster = await MockBooster.deploy();
    await booster.waitForDeployment();
    
    const rewardTokens: string[] = [];
    
    // Deploy CVXStaker with operator as the operator
    const Factory = await ethers.getContractFactory("CVXStaker");
    const instance = await Factory.deploy(
      operator.address,
      await clpToken.getAddress(),
      await booster.getAddress(),
      rewardTokens
    );
    await instance.waitForDeployment();
    
    // Test 1: Non-operator should NOT be able to call depositAndStake (original behavior)
    // The mutant would allow this, so this test would fail on the mutant
    await expect(
      instance.connect(nonOperator).depositAndStake(ethers.parseEther("100"))
    ).to.be.reverted;
    
    // Test 2: Operator SHOULD be able to call depositAndStake (original behavior)
    // The mutant would revert this, so this test would fail on the mutant
    // Fund contract with CLP tokens first
    await clpToken.transfer(await instance.getAddress(), ethers.parseEther("1000"));
    
    // Set CVX pool info so isCvxShutdown returns false
    await instance.connect(owner).setCvxPoolInfo(
      0,
      await clpToken.getAddress(),
      ethers.ZeroAddress
    );
    
    // Approve booster to spend CLP tokens (needed for deposit)
    await clpToken.approve(await booster.getAddress(), ethers.parseEther("1000"));
    
    // Operator should be able to call depositAndStake
    await expect(
      instance.connect(operator).depositAndStake(ethers.parseEther("100"))
    ).to.not.be.reverted;
  });
});