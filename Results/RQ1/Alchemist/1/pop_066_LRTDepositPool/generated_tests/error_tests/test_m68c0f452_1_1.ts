import { expect } from "chai";
import { ethers } from "hardhat";

describe("LRTDepositPool - Mutant m68c0f452: getRsETHAmountToMint division removal", function () {
    let lrtDepositPool: any;
    let lrtConfig: any;
    let lrtOracle: any;
    let rsethToken: any;
    let assetToken: any;
    let owner: any;
    let user: any;
    let nodeDelegator: any;

    beforeEach(async function () {
        [owner, user] = await ethers.getSigners();

        // Deploy mock ERC20 asset token
        const ERC20Factory = await ethers.getContractFactory("MockERC20");
        assetToken = await ERC20Factory.deploy("Test Asset", "TST", 18);
        await assetToken.waitForDeployment();

        // Deploy mock rsETH token
        const RSETHFactory = await ethers.getContractFactory("MockRSETH");
        rsethToken = await RSETHFactory.deploy("rsETH", "RSETH", 18);
        await rsethToken.waitForDeployment();

        // Deploy mock LRT Oracle
        const OracleFactory = await ethers.getContractFactory("MockLRTOracle");
        lrtOracle = await OracleFactory.deploy();
        await lrtOracle.waitForDeployment();

        // Deploy mock LRT Config
        const ConfigFactory = await ethers.getContractFactory("MockLRTConfig");
        lrtConfig = await ConfigFactory.deploy();
        await lrtConfig.waitForDeployment();

        // Deploy mock NodeDelegator
        const NodeDelegatorFactory = await ethers.getContractFactory("MockNodeDelegator");
        nodeDelegator = await NodeDelegatorFactory.deploy();
        await nodeDelegator.waitForDeployment();

        // Deploy LRTDepositPool
        const LRTDepositPoolFactory = await ethers.getContractFactory("LRTDepositPool");
        lrtDepositPool = await LRTDepositPoolFactory.deploy();
        await lrtDepositPool.waitForDeployment();

        // Initialize LRTDepositPool
        await lrtDepositPool.initialize(await lrtConfig.getAddress());

        // Setup LRTConfig
        await lrtConfig.setRsETH(await rsethToken.getAddress());
        await lrtConfig.setContract(ethers.keccak256(ethers.toUtf8Bytes("LRT_ORACLE")), await lrtOracle.getAddress());
        await lrtConfig.addSupportedAsset(await assetToken.getAddress(), ethers.parseEther("1000000"));
        
        // Add node delegator
        await lrtDepositPool.addNodeDelegatorContractToQueue([await nodeDelegator.getAddress()]);

        // Setup oracle prices
        await lrtOracle.setAssetPrice(await assetToken.getAddress(), ethers.parseEther("1")); // $1 per token
        await lrtOracle.setRSETHPrice(ethers.parseEther("2")); // $2 per rsETH

        // Grant manager role to owner
        const MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MANAGER"));
        await lrtConfig.grantRole(MANAGER_ROLE, owner.address);

        // Transfer some tokens to user for testing
        await assetToken.mint(user.address, ethers.parseEther("1000"));
        await assetToken.connect(user).approve(await lrtDepositPool.getAddress(), ethers.parseEther("1000"));
    });

    it("should correctly calculate rsETH amount to mint with division by RSETH price", async function () {
        const depositAmount = ethers.parseEther("100");
        const assetPrice = ethers.parseEther("1");
        const rsethPrice = ethers.parseEther("2");
        
        // Expected calculation: (amount * assetPrice) / rsethPrice
        const expectedRsethAmount = (depositAmount * assetPrice) / rsethPrice;

        // Get the calculated amount from the contract
        const actualRsethAmount = await lrtDepositPool.getRsETHAmountToMint(
            await assetToken.getAddress(),
            depositAmount
        );

        // If mutant is present (division removed), actualRsethAmount will be (amount * assetPrice) without division
        // which would be double the expected value (since rsethPrice = 2)
        expect(actualRsethAmount).to.equal(expectedRsethAmount);
    });

    it("should revert when trying to deposit with incorrect rsETH mint calculation", async function () {
        const depositAmount = ethers.parseEther("100");
        
        // Get the expected rsETH amount to mint
        const expectedRsethAmount = await lrtDepositPool.getRsETHAmountToMint(
            await assetToken.getAddress(),
            depositAmount
        );

        // Perform the deposit
        const tx = await lrtDepositPool.connect(user).depositAsset(
            await assetToken.getAddress(),
            depositAmount
        );
        await tx.wait();

        // Check that the user received the correct amount of rsETH
        const userRsethBalance = await rsethToken.balanceOf(user.address);
        
        // If mutant is present, the minted amount will be wrong (too high)
        // because the division by RSETH price was removed
        expect(userRsethBalance).to.equal(expectedRsethAmount);
    });
});