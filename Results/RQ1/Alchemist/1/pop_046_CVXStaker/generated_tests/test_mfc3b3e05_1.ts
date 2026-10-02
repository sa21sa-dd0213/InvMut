import { expect } from "chai";
import { ethers } from "hardhat";

describe("CVXStaker mutant detection - setOperator", function () {
  it("should kill mutant mfc3b3e05 by verifying operator is set to the passed address, not the contract itself", async function () {
    const [owner, operator, addr1] = await ethers.getSigners();
    
    // Deploy mock CLP token
    const MockToken = await ethers.getContractFactory("MockERC20");
    const clpToken = await MockToken.deploy("CLP Token", "CLP", ethers.parseEther("1000000"));
    await clpToken.waitForDeployment();
    
    // Deploy mock Booster
    const MockBooster = await ethers.getContractFactory("MockCVXBooster");
    const booster = await MockBooster.deploy();
    await booster.waitForDeployment();
    
    // Deploy CVXStaker with constructor arguments
    const rewardTokens: string[] = [];
    const CVXStakerFactory = await ethers.getContractFactory("CVXStaker");
    const staker = await CVXStakerFactory.deploy(
      operator.address,
      await clpToken.getAddress(),
      await booster.getAddress(),
      rewardTokens
    );
    await staker.waitForDeployment();
    
    // Set CVX pool info (required for depositAndStake to work)
    await staker.connect(owner).setCvxPoolInfo(0, await clpToken.getAddress(), ethers.ZeroAddress);
    
    // Fund the staker with some CLP tokens for the test
    await clpToken.transfer(await staker.getAddress(), ethers.parseEther("100"));
    
    // Call setOperator with a specific address (addr1)
    await staker.connect(owner).setOperator(addr1.address);
    
    // Verify operator is set to addr1, not the contract itself
    const currentOperator = await staker.operator();
    expect(currentOperator).to.equal(addr1.address);
    expect(currentOperator).to.not.equal(await staker.getAddress());
    
    // Try calling depositAndStake from addr1 - should succeed if operator is correct
    // If mutant is present, this will revert because operator would be contract address
    const depositAmount = ethers.parseEther("10");
    await clpToken.connect(addr1).approve(await staker.getAddress(), depositAmount);
    await expect(
      staker.connect(addr1).depositAndStake(depositAmount)
    ).to.not.be.reverted;
  });
});