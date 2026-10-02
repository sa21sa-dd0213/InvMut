import { expect } from "chai";
import { ethers } from "hardhat";

describe("LRTDepositPool mutant detection - getAssetDistributionData out of bounds", function () {
  it("should revert when calling getAssetDistributionData with an empty nodeDelegatorQueue", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy LRTDepositPool (constructor takes no arguments, uses _disableInitializers)
    const LRTDepositPoolFactory = await ethers.getContractFactory("LRTDepositPool");
    const depositPool = await LRTDepositPoolFactory.deploy();
    await depositPool.waitForDeployment();

    // Deploy a mock LRTConfig with required interface
    const LRTConfigFactory = await ethers.getContractFactory("LRTConfig");
    const lrtConfig = await LRTConfigFactory.deploy();
    await lrtConfig.waitForDeployment();

    // Deploy a mock ERC20 asset
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    const mockAsset = await MockERC20Factory.deploy("Test", "TST", 18);
    await mockAsset.waitForDeployment();

    // Initialize deposit pool with LRT config
    await depositPool.initialize(await lrtConfig.getAddress());

    // Make the mock asset supported in LRTConfig
    await lrtConfig.addNewSupportedAsset(await mockAsset.getAddress(), ethers.parseEther("1000"));

    // Ensure nodeDelegatorQueue is empty (should be after initialization)
    const queue = await depositPool.getNodeDelegatorQueue();
    expect(queue.length).to.equal(0);

    // This call should succeed on original (returns 0 for NDC values)
    // But on the mutant with i <= ndcsCount, it will try to access nodeDelegatorQueue[0]
    // which doesn't exist, causing a revert
    await expect(
      depositPool.getAssetDistributionData(await mockAsset.getAddress())
    ).to.not.be.reverted;
  });
});