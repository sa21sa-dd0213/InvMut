import { expect } from "chai";
import { ethers } from "hardhat";

describe("LRTDepositPool mutant kill test - getTotalAssetDeposits", function () {
  it("should return correct total asset deposits when assets are distributed across pool, NDCs, and EigenLayer", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy LRTConfig mock or use actual deployment
    // For this test, we need to deploy LRTConfig and other dependencies
    const LRTConfigFactory = await ethers.getContractFactory("LRTConfig");
    const lrtConfig = await LRTConfigFactory.deploy();
    await lrtConfig.waitForDeployment();
    
    // Deploy LRTDepositPool
    const Factory = await ethers.getContractFactory("LRTDepositPool");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract
    await instance.initialize(await lrtConfig.getAddress());
    
    // Setup test asset (e.g., a mock ERC20)
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    const testAsset = await MockERC20Factory.deploy("Test", "TST", 18);
    await testAsset.waitForDeployment();
    
    // Add asset as supported in LRTConfig
    const assetAddress = await testAsset.getAddress();
    await lrtConfig.addNewSupportedAsset(assetAddress, ethers.parseEther("1000000"));
    
    // Deploy a mock NodeDelegator
    const MockNodeDelegatorFactory = await ethers.getContractFactory("MockNodeDelegator");
    const ndc = await MockNodeDelegatorFactory.deploy();
    await ndc.waitForDeployment();
    
    // Add NodeDelegator to queue
    await instance.addNodeDelegatorContractToQueue([await ndc.getAddress()]);
    
    // Transfer some tokens to the deposit pool
    await testAsset.transfer(await instance.getAddress(), ethers.parseEther("100"));
    
    // Transfer some tokens to the NodeDelegator
    await testAsset.transfer(await ndc.getAddress(), ethers.parseEther("50"));
    
    // Set asset balance in NodeDelegator to simulate staked amount
    await ndc.setAssetBalance(assetAddress, ethers.parseEther("30"));
    
    // Call getTotalAssetDeposits and verify it returns the correct sum
    // Expected: 100 (in pool) + 50 (in NDC) + 30 (staked) = 180
    const totalDeposits = await instance.getTotalAssetDeposits(assetAddress);
    
    // The mutant would return 0 instead of 180, so this assertion kills it
    expect(totalDeposits).to.equal(ethers.parseEther("180"));
  });
});