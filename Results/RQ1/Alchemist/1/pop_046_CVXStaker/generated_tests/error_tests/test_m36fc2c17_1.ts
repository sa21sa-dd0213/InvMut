import { expect } from "chai";
import { ethers } from "hardhat";

describe("CVXStaker mutant m36fc2c17 - isCvxShutdown return value", function () {
  it("should detect mutant by verifying isCvxShutdown returns boolean false when pool is not shutdown", async function () {
    const [owner, operator] = await ethers.getSigners();
    
    // Deploy mock booster contract that returns PoolInfo struct with shutdown = false
    const MockBoosterFactory = await ethers.getContractFactory("MockBooster");
    const mockBooster = await MockBoosterFactory.deploy();
    await mockBooster.waitForDeployment();
    
    // Deploy mock CLP token
    const MockTokenFactory = await ethers.getContractFactory("MockERC20");
    const mockClpToken = await MockTokenFactory.deploy("CLP Token", "CLP");
    await mockClpToken.waitForDeployment();
    
    // Deploy CVXStaker with required constructor arguments
    const CVXStakerFactory = await ethers.getContractFactory("CVXStaker");
    const cvxStaker = await CVXStakerFactory.deploy(
      operator.address,
      await mockClpToken.getAddress(),
      await mockBooster.getAddress(),
      [] // empty reward tokens array
    );
    await cvxStaker.waitForDeployment();
    
    // Set cvxPoolInfo with pool ID 0
    await cvxStaker.connect(owner).setCvxPoolInfo(0, await mockClpToken.getAddress(), ethers.ZeroAddress);
    
    // Configure mock booster to return pool with shutdown = false
    await mockBooster.setPoolInfo(0, await mockClpToken.getAddress(), ethers.ZeroAddress, ethers.ZeroAddress, ethers.ZeroAddress, false);
    
    // Call isCvxShutdown - should return false for original, but mutant returns entire struct which is truthy
    const result = await cvxStaker.isCvxShutdown();
    
    // The mutant would return a struct (truthy) instead of boolean false
    // This assertion should fail on the mutant because it returns the struct
    expect(result).to.equal(false);
  });
});