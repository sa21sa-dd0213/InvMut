import { expect } from "chai";
import { ethers } from "hardhat";

describe("DnGmxBatchingManager mutant mcd2eaf3a test", function () {
  it("should kill the mutant by verifying keeper address is set correctly after initialization", async function () {
    const [owner, keeper] = await ethers.getSigners();
    
    // Deploy mock contracts needed for initialization
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const sGlp = await MockERC20.deploy("sGLP", "sGLP", 18);
    await sGlp.waitForDeployment();
    
    const usdc = await MockERC20.deploy("USDC", "USDC", 6);
    await usdc.waitForDeployment();
    
    const MockRewardRouter = await ethers.getContractFactory("MockRewardRouterV2");
    const rewardRouter = await MockRewardRouter.deploy();
    await rewardRouter.waitForDeployment();
    
    const MockGlpManager = await ethers.getContractFactory("MockGlpManager");
    const glpManager = await MockGlpManager.deploy();
    await glpManager.waitForDeployment();
    
    const MockJuniorVault = await ethers.getContractFactory("MockDnGmxJuniorVault");
    const dnGmxJuniorVault = await MockJuniorVault.deploy();
    await dnGmxJuniorVault.waitForDeployment();
    
    // Deploy the DnGmxBatchingManager contract
    const Factory = await ethers.getContractFactory("DnGmxBatchingManager");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract with keeper address
    await instance.initialize(
      await sGlp.getAddress(),
      await usdc.getAddress(),
      await rewardRouter.getAddress(),
      await glpManager.getAddress(),
      await dnGmxJuniorVault.getAddress(),
      keeper.address
    );
    
    // Attempt to call a keeper-restricted function from the keeper address
    // If the mutant is active (keeper set to address(0)), this will revert
    // If original code is active (keeper set correctly), this will succeed or revert with different error
    await expect(
      instance.connect(keeper).pauseDeposit()
    ).to.not.be.revertedWith("CallerNotKeeper");
    
    // Additional verification: check that keeper address is not zero
    const storedKeeper = await instance.keeper();
    expect(storedKeeper).to.not.equal(ethers.ZeroAddress);
    expect(storedKeeper).to.equal(keeper.address);
  });
});