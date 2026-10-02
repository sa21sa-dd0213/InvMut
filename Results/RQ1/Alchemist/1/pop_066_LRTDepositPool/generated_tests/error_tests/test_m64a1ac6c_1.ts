import { expect } from "chai";
import { ethers } } from "hardhat";

describe("LRTDepositPool - Mutant m64a1ac6c", function () {
    it("should correctly sum asset balances from node delegators in getAssetDistributionData", async function () {
        const [owner, addr1, addr2] = await ethers.getSigners();
        
        // Deploy LRTConfig first (required by LRTDepositPool)
        const LRTConfigFactory = await ethers.getContractFactory("LRTConfig");
        const lrtConfig = await LRTConfigFactory.deploy();
        await lrtConfig.waitForDeployment();
        
        // Deploy LRTDepositPool
        const Factory = await ethers.getContractFactory("LRTDepositPool");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();
        
        // Initialize the contract
        await instance.initialize(await lrtConfig.getAddress());
        
        // Deploy a mock ERC20 token for testing
        const MockERC20Factory = await ethers.getContractFactory("MockERC20");
        const mockToken = await MockERC20Factory.deploy("Test Token", "TST", ethers.parseEther("1000000"));
        await mockToken.waitForDeployment();
        
        // Add token as supported asset in LRTConfig
        await lrtConfig.addNewSupportedAsset(await mockToken.getAddress(), ethers.parseEther("1000000"));
        
        // Deploy a mock NodeDelegator contract
        const MockNodeDelegatorFactory = await ethers.getContractFactory("MockNodeDelegator");
        const mockNodeDelegator = await MockNodeDelegatorFactory.deploy();
        await mockNodeDelegator.waitForDeployment();
        
        // Add node delegator to queue
        await instance.addNodeDelegatorContractToQueue([await mockNodeDelegator.getAddress()]);
        
        // Transfer tokens to the node delegator to simulate assets held
        const depositAmount = ethers.parseEther("100");
        await mockToken.transfer(await mockNodeDelegator.getAddress(), depositAmount);
        
        // Also deposit some tokens directly to the deposit pool
        await mockToken.approve(await instance.getAddress(), ethers.parseEther("50"));
        await instance.depositAsset(await mockToken.getAddress(), ethers.parseEther("50"));
        
        // Call getAssetDistributionData
        const distribution = await instance.getAssetDistributionData(await mockToken.getAddress());
        
        // assetLyingInDepositPool should be 50 (from direct deposit)
        // assetLyingInNDCs should be 100 (from tokens sent to node delegator)
        // assetStakedInEigenLayer should be 0 (mock doesn't stake)
        expect(distribution.assetLyingInDepositPool).to.equal(ethers.parseEther("50"));
        expect(distribution.assetLyingInNDCs).to.equal(ethers.parseEther("100"));
        expect(distribution.assetStakedInEigenLayer).to.equal(0);
        
        // Total should be 150
        expect(distribution.assetLyingInDepositPool + distribution.assetLyingInNDCs + distribution.assetStakedInEigenLayer)
            .to.equal(ethers.parseEther("150"));
    });
});