import { expect } from "chai";
import { ethers } from "hardhat";

describe("LRTDepositPool mutant mcd4e7a3f test", function () {
  it("should detect mutant by checking getTotalAssetDeposits after transferring assets to node delegator", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy mock contracts needed for LRTDepositPool
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockAsset = await MockERC20.deploy("MockAsset", "MA", ethers.parseEther("1000000"));
    await mockAsset.waitForDeployment();

    const MockLRTConfig = await ethers.getContractFactory("MockLRTConfig");
    const mockLRTConfig = await MockLRTConfig.deploy();
    await mockLRTConfig.waitForDeployment();

    const MockNodeDelegator = await ethers.getContractFactory("MockNodeDelegator");
    const mockNodeDelegator = await MockNodeDelegator.deploy();
    await mockNodeDelegator.waitForDeployment();

    const MockLRTOracle = await ethers.getContractFactory("MockLRTOracle");
    const mockLRTOracle = await MockLRTOracle.deploy();
    await mockLRTOracle.waitForDeployment();

    const MockRSETH = await ethers.getContractFactory("MockRSETH");
    const mockRSETH = await MockRSETH.deploy();
    await mockRSETH.waitForDeployment();

    // Setup LRTConfig
    await mockLRTConfig.setRsETH(mockRSETH.target);
    await mockLRTConfig.setContract(ethers.encodeBytes32String("LRT_ORACLE"), mockLRTOracle.target);
    await mockLRTConfig.addSupportedAsset(mockAsset.target, ethers.parseEther("1000000"));
    await mockLRTConfig.setDepositLimit(mockAsset.target, ethers.parseEther("1000000"));

    // Deploy LRTDepositPool
    const LRTDepositPool = await ethers.getContractFactory("LRTDepositPool");
    const depositPool = await LRTDepositPool.deploy();
    await depositPool.waitForDeployment();

    // Initialize
    await depositPool.initialize(mockLRTConfig.target);

    // Grant MANAGER role to owner
    const MANAGER_ROLE = ethers.encodeBytes32String("MANAGER");
    await mockLRTConfig.grantRole(MANAGER_ROLE, owner.address);

    // Add node delegator to queue
    await depositPool.addNodeDelegatorContractToQueue([mockNodeDelegator.target]);

    // Transfer some assets to the deposit pool
    await mockAsset.transfer(depositPool.target, ethers.parseEther("100"));
    const initialPoolBalance = ethers.parseEther("100");

    // Transfer assets from deposit pool to node delegator
    await mockAsset.transfer(mockNodeDelegator.target, ethers.parseEther("30"));

    // Setup mock for node delegator balance
    await mockNodeDelegator.setAssetBalance(mockAsset.target, ethers.parseEther("30"));

    // Call getTotalAssetDeposits - original would return 130, mutant would return 70
    const totalDeposits = await depositPool.getTotalAssetDeposits(mockAsset.target);

    // Original calculation: 100 + 30 + 0 = 130
    // Mutant calculation: 100 - 30 + 0 = 70
    // If mutant is present, totalDeposits will be 70 instead of 130
    expect(totalDeposits).to.equal(ethers.parseEther("130"));
  });
});