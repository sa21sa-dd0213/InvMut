import { expect } from "chai";
import { ethers } from "hardhat";

describe("LRTDepositPool - Mutant kill test for getTotalAssetDeposits", function () {
    let lrtConfig: any;
    let lrtDepositPool: any;
    let lrtOracle: any;
    let rsethToken: any;
    let nodeDelegator: any;
    let assetToken: any;
    let owner: any;
    let user: any;

    beforeEach(async function () {
        [owner, user] = await ethers.getSigners();

        // Deploy a mock ERC20 asset token
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        assetToken = await MockERC20.deploy("TestAsset", "TST", 18);
        await assetToken.waitForDeployment();

        // Deploy a mock rsETH token
        const MockRSETH = await ethers.getContractFactory("MockRSETH");
        rsethToken = await MockRSETH.deploy();
        await rsethToken.waitForDeployment();

        // Deploy a mock LRT Oracle
        const MockLRTOracle = await ethers.getContractFactory("MockLRTOracle");
        lrtOracle = await MockLRTOracle.deploy();
        await lrtOracle.waitForDeployment();
        await lrtOracle.setAssetPrice(await assetToken.getAddress(), ethers.parseEther("1"));
        await lrtOracle.setRSETHPrice(ethers.parseEther("1"));

        // Deploy a mock NodeDelegator
        const MockNodeDelegator = await ethers.getContractFactory("MockNodeDelegator");
        nodeDelegator = await MockNodeDelegator.deploy();
        await nodeDelegator.waitForDeployment();

        // Deploy LRTConfig
        const LRTConfig = await ethers.getContractFactory("LRTConfig");
        lrtConfig = await LRTConfig.deploy();
        await lrtConfig.waitForDeployment();
                
        // Setup LRTConfig
        await lrtConfig.setContract(ethers.encodeBytes32String("LRT_ORACLE"), await lrtOracle.getAddress());
        await lrtConfig.setContract(ethers.encodeBytes32String("R_ETH_TOKEN"), await rsethToken.getAddress());
        await lrtConfig.setToken(ethers.encodeBytes32String("R_ETH_TOKEN"), await rsethToken.getAddress());
        await lrtConfig.addNewSupportedAsset(await assetToken.getAddress(), ethers.parseEther("10000"));
                
        // Grant MANAGER role to owner
        const MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MANAGER"));
        await lrtConfig.grantRole(MANAGER_ROLE, owner.address);

        // Deploy LRTDepositPool
        const Factory = await ethers.getContractFactory("LRTDepositPool");
        lrtDepositPool = await Factory.deploy();
        await lrtDepositPool.waitForDeployment();
                
        // Initialize
        await lrtDepositPool.initialize(await lrtConfig.getAddress());
                
        // Add node delegator to queue
        await lrtDepositPool.addNodeDelegatorContractToQueue([await nodeDelegator.getAddress()]);
                
        // Fund user with test asset
        await assetToken.mint(user.address, ethers.parseEther("100"));
        await assetToken.connect(user).approve(await lrtDepositPool.getAddress(), ethers.parseEther("100"));
                
        // Set up node delegator to simulate staked assets
        await nodeDelegator.setAssetBalance(await assetToken.getAddress(), ethers.parseEther("50"));
    });

    it("should correctly compute total asset deposits including staked amounts", async function () {
        // Deposit asset into the pool
        const depositAmount = ethers.parseEther("30");
        await lrtDepositPool.connect(user).depositAsset(await assetToken.getAddress(), depositAmount);
                
        // Get the asset distribution data
        const distribution = await lrtDepositPool.getAssetDistributionData(await assetToken.getAddress());
        const assetLyingInDepositPool = distribution[0];
        const assetLyingInNDCs = distribution[1];
        const assetStakedInEigenLayer = distribution[2];
                
        // Calculate expected total: sum of all three components
        const expectedTotal = assetLyingInDepositPool + assetLyingInNDCs + assetStakedInEigenLayer;
                
        // Get total from the function under test
        const actualTotal = await lrtDepositPool.getTotalAssetDeposits(await assetToken.getAddress());
                
        // Assert that total equals the sum (mutant would subtract staked amount)
        expect(actualTotal).to.equal(expectedTotal);
                
        // Additional check: if mutant were active, it would return a smaller value
        // because it subtracts assetStakedInEigenLayer instead of adding it
        const mutantExpected = assetLyingInDepositPool + assetLyingInNDCs - assetStakedInEigenLayer;
        expect(actualTotal).to.not.equal(mutantExpected);
    });
});