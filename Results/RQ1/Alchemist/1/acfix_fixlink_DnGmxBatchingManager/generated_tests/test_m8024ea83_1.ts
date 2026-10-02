import { expect } from "chai";
import { ethers } from "hardhat";

describe("DnGmxBatchingManager - Mutant m8024ea83 (setKeeper always sets address(0))", function () {
  let instance: any;
  let owner: any;
  let keeper: any;
  let unauthorizedUser: any;
  let sGlp: any;
  let usdc: any;
  let rewardRouter: any;
  let glpManager: any;
  let dnGmxJuniorVault: any;

  beforeEach(async function () {
    [owner, keeper, unauthorizedUser] = await ethers.getSigners();

    // Deploy mock contracts for dependencies
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    sGlp = await MockERC20.deploy("sGLP", "sGLP");
    usdc = await MockERC20.deploy("USDC", "USDC");
    
    const MockGlpManager = await ethers.getContractFactory("MockGlpManager");
    glpManager = await MockGlpManager.deploy();
    
    const MockRewardRouterV2 = await ethers.getContractFactory("MockRewardRouterV2");
    rewardRouter = await MockRewardRouterV2.deploy();
    
    const MockDnGmxJuniorVault = await ethers.getContractFactory("MockDnGmxJuniorVault");
    dnGmxJuniorVault = await MockDnGmxJuniorVault.deploy();

    const Factory = await ethers.getContractFactory("DnGmxBatchingManager");
    instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract
    await instance.initialize(
      await sGlp.getAddress(),
      await usdc.getAddress(),
      await rewardRouter.getAddress(),
      await glpManager.getAddress(),
      await dnGmxJuniorVault.getAddress(),
      keeper.address
    );
  });

  it("should kill the mutant by verifying setKeeper sets keeper to address(0) instead of the provided address", async function () {
    // Initially, keeper should be the address passed during initialization
    const initialKeeper = await instance.keeper();
    expect(initialKeeper).to.equal(keeper.address);

    // Call setKeeper with a new keeper address
    const newKeeperAddress = unauthorizedUser.address;
    await instance.connect(owner).setKeeper(newKeeperAddress);

    // In the original contract, keeper should now be newKeeperAddress
    // In the mutant, keeper will be address(0) regardless of input
    const updatedKeeper = await instance.keeper();
    
    // This assertion will fail for the mutant because it will be address(0) instead of newKeeperAddress
    expect(updatedKeeper).to.equal(newKeeperAddress);
    
    // Additional verification: try to call a keeper-only function with the new keeper address
    // In the original, this should succeed; in the mutant, it should revert
    await expect(
      instance.connect(unauthorizedUser).pauseDeposit()
    ).to.not.be.reverted;
  });
});