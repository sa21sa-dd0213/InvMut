import { expect } from "chai";
import { ethers } from "hardhat";

describe("LRTDepositPool - Kill mutant mdecda3de (zero amount deposit)", function () {
    let owner: any;
    let lrtDepositPool: any;
    let lrtConfig: any;
    let mockAsset: any;
    let mockRseth: any;
    let mockOracle: any;

    beforeEach(async function () {
        [owner] = await ethers.getSigners();

        // Deploy mock contracts needed for LRTDepositPool
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        mockAsset = await MockERC20.deploy("Mock Asset", "MASS", 18);
        await mockAsset.waitForDeployment();

        const MockRSETH = await ethers.getContractFactory("MockRSETH");
        mockRseth = await MockRSETH.deploy("rsETH", "rsETH", 18);
        await mockRseth.waitForDeployment();

        const MockLRTOracle = await ethers.getContractFactory("MockLRTOracle");
        mockOracle = await MockLRTOracle.deploy();
        await mockOracle.waitForDeployment();

        // Deploy mock LRTConfig
        const MockLRTConfig = await ethers.getContractFactory("MockLRTConfig");
        lrtConfig = await MockLRTConfig.deploy();
        await lrtConfig.waitForDeployment();

        // Setup LRTConfig
        await lrtConfig.setRsETH(await mockRseth.getAddress());
        await lrtConfig.setContract(ethers.keccak256(ethers.toUtf8Bytes("LRT_ORACLE")), await mockOracle.getAddress());
        await lrtConfig.addSupportedAsset(await mockAsset.getAddress(), ethers.parseEther("1000"));

        // Deploy LRTDepositPool
        const LRTDepositPoolFactory = await ethers.getContractFactory("LRTDepositPool");
        lrtDepositPool = await LRTDepositPoolFactory.deploy();
        await lrtDepositPool.waitForDeployment();

        // Initialize LRTDepositPool
        await lrtDepositPool.initialize(await lrtConfig.getAddress());

        // Setup oracle price
        await mockOracle.setAssetPrice(await mockAsset.getAddress(), ethers.parseEther("1"));
        await mockOracle.setRSETHPrice(ethers.parseEther("1"));

        // Transfer some tokens to owner for deposit
        await mockAsset.mint(owner.address, ethers.parseEther("100"));
        await mockAsset.connect(owner).approve(await lrtDepositPool.getAddress(), ethers.parseEther("100"));
    });

    it("should revert when depositing zero amount", async function () {
        // This test should pass on original contract but fail on mutant
        // Mutant changes `if (depositAmount == 0)` to `if (false)`
        await expect(
            lrtDepositPool.connect(owner).depositAsset(
                await mockAsset.getAddress(), 
                0 // zero amount should trigger InvalidAmount revert
            )
        ).to.be.revertedWithCustomError(lrtDepositPool, "InvalidAmount");
    });
});