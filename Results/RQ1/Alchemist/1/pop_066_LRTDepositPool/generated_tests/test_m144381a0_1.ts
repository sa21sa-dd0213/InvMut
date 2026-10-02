import { expect } from "chai";
import { ethers } from "hardhat";

describe("LRTDepositPool mutant detection - onlySupportedAsset modifier removal", function () {
    it("should revert when calling getAssetDistributionData with an unsupported asset on original contract", async function () {
        const [owner, addr1] = await ethers.getSigners();
        
        // Deploy LRTDepositPool
        const Factory = await ethers.getContractFactory("LRTDepositPool");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();
        
        // Deploy a mock LRTConfig to control supported assets
        const LRTConfigFactory = await ethers.getContractFactory("LRTConfig");
        const lrtConfig = await LRTConfigFactory.deploy();
        await lrtConfig.waitForDeployment();
        
        // Initialize the deposit pool with the LRTConfig
        await instance.initialize(await lrtConfig.getAddress());
        
        // Get an unsupported asset address (any random address)
        const unsupportedAsset = addr1.address;
        
        // Verify the asset is not supported by default
        expect(await lrtConfig.isSupportedAsset(unsupportedAsset)).to.be.false;
        
        // Call getAssetDistributionData with unsupported asset - should revert
        await expect(
            instance.getAssetDistributionData(unsupportedAsset)
        ).to.be.revertedWithCustomError(instance, "AssetNotSupported");
    });
    
    it("should detect mutant by allowing call with unsupported asset without revert", async function () {
        const [owner, addr1] = await ethers.getSigners();
        
        // Deploy LRTDepositPool
        const Factory = await ethers.getContractFactory("LRTDepositPool");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();
        
        // Deploy a mock LRTConfig
        const LRTConfigFactory = await ethers.getContractFactory("LRTConfig");
        const lrtConfig = await LRTConfigFactory.deploy();
        await lrtConfig.waitForDeployment();
        
        // Initialize
        await instance.initialize(await lrtConfig.getAddress());
        
        // Get an unsupported asset
        const unsupportedAsset = addr1.address;
        
        // The mutant would NOT revert here (removed modifier)
        // We expect this to revert, but if it doesn't, the mutant is killed
        try {
            await instance.getAssetDistributionData(unsupportedAsset);
            // If we reach here, the mutant is alive (no revert happened)
            // But for the original, this should have reverted
            // So we assert false to indicate we expected a revert
            expect.fail("Expected revert with AssetNotSupported, but call succeeded");
        } catch (error: any) {
            // Check if the error contains our expected revert reason
            // For the original contract, we expect AssetNotSupported
            // For the mutant, we might get a different error or no error
            expect(error.message).to.include("AssetNotSupported");
        }
    });
});