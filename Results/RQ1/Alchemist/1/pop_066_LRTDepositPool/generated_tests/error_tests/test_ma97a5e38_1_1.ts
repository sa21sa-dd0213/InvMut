import { expect } from "chai";
import { ethers } from "hardhat";

describe("LRTDepositPool mutant ma97a5e38 - getTotalAssetDeposits operator change", function () {
  it("should detect mutant by comparing getTotalAssetDeposits with known asset distribution", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy LRTConfig mock
    const LRTConfigFactory = await ethers.getContractFactory("LRTConfig");
    const lrtConfig = await LRTConfigFactory.deploy();
    await lrtConfig.waitForDeployment();

    // Deploy LRTDepositPool (constructor takes no arguments, uses _disableInitializers)
    const LRTDepositPoolFactory = await ethers.getContractFactory("LRTDepositPool");
    const depositPool = await LRTDepositPoolFactory.deploy();
    await depositPool.waitForDeployment();

    // Initialize deposit pool with LRTConfig address
    await depositPool.initialize(await lrtConfig.getAddress());

    // Deploy a mock ERC20 asset
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    const asset = await MockERC20Factory.deploy("Test Asset", "TST", ethers.parseEther("1000"));
    await asset.waitForDeployment();

    // Deploy a mock NodeDelegator
    const MockNodeDelegatorFactory = await ethers.getContractFactory("MockNodeDelegator");
    const nodeDelegator = await MockNodeDelegatorFactory.deploy();
    await nodeDelegator.waitForDeployment();

    // Setup LRTConfig to support the asset
    await lrtConfig.addNewSupportedAsset(await asset.getAddress(), ethers.parseEther("1000"));
    await lrtConfig.setContract(ethers.encodeBytes32String("LRT_ORACLE"), addr1.address); // placeholder oracle

    // Add node delegator to queue
    await depositPool.addNodeDelegatorContractToQueue([await nodeDelegator.getAddress()]);

    // Transfer some asset to deposit pool directly (simulating assetLyingInDepositPool)
    await asset.transfer(await depositPool.getAddress(), ethers.parseEther("5"));

    // Transfer some asset to node delegator (simulating assetLyingInNDCs)
    await asset.transfer(await nodeDelegator.getAddress(), ethers.parseEther("3"));

    // Set node delegator to return 0 for staked balance (simplified)
    // In real scenario, this would be set via EigenLayer strategy, but for test we assume 0

    // Get the total asset deposits
    const totalDeposits = await depositPool.getTotalAssetDeposits(await asset.getAddress());

    // Expected: 5 (in pool) + 3 (in NDC) + 0 (staked) = 8
    // Mutant would compute: 5 * 3 + 0 = 15
    expect(totalDeposits).to.equal(ethers.parseEther("8"));
  });
});