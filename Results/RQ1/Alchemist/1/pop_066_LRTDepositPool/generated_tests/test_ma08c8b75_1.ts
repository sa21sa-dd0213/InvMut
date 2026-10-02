import { expect } from "chai";
import { ethers } from "hardhat";

describe("LRTDepositPool mutant ma08c8b75 test", function () {
  it("should revert when calling getAssetDistributionData with unsupported asset on original but not on mutant", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy LRTDepositPool (constructor takes no arguments)
    const LRTDepositPoolFactory = await ethers.getContractFactory("LRTDepositPool");
    const lrtDepositPool = await LRTDepositPoolFactory.deploy();
    await lrtDepositPool.waitForDeployment();
    
    // Deploy mock LRTConfig with required interface
    const LRTConfigFactory = await ethers.getContractFactory("LRTConfig");
    const lrtConfig = await LRTConfigFactory.deploy();
    await lrtConfig.waitForDeployment();
    
    // Initialize the deposit pool with the LRT config
    await lrtDepositPool.initialize(await lrtConfig.getAddress());
    
    // Get an address that is NOT a supported asset (e.g., zero address or random address)
    const unsupportedAsset = "0x0000000000000000000000000000000000000001";
    
    // Attempt to call getAssetDistributionData with unsupported asset
    // Original contract should revert with AssetNotSupported error
    // Mutant should NOT revert (removing the modifier)
    await expect(
      lrtDepositPool.getAssetDistributionData(unsupportedAsset)
    ).to.be.reverted;
  });
});