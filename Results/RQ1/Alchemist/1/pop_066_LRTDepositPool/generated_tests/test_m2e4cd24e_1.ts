import { expect } from "chai";
import { ethers } from "hardhat";

describe("LRTDepositPool mutant m2e4cd24e - getAssetCurrentLimit", function () {
  it("should detect mutant by verifying getAssetCurrentLimit returns correct available limit after deposits", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy LRTDepositPool
    const LRTDepositPoolFactory = await ethers.getContractFactory("LRTDepositPool");
    const depositPool = await LRTDepositPoolFactory.deploy();
    await depositPool.waitForDeployment();
    
    // Deploy mock LRTConfig
    const LRTConfigFactory = await ethers.getContractFactory("LRTConfig");
    const lrtConfig = await LRTConfigFactory.deploy();
    await lrtConfig.waitForDeployment();
    
    // Deploy mock RSETH token
    const RSETHFactory = await ethers.getContractFactory("RSETH");
    const rseth = await RSETHFactory.deploy();
    await rseth.waitForDeployment();
    
    // Deploy mock LRTOracle
    const LRTOracleFactory = await ethers.getContractFactory("LRTOracle");
    const lrtOracle = await LRTOracleFactory.deploy();
    await lrtOracle.waitForDeployment();
    
    // Deploy mock ERC20 asset
    const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
    const asset = await ERC20Factory.deploy("Test Asset", "TST", 18);
    await asset.waitForDeployment();
    
    // Configure LRTConfig
    await lrtConfig.setRSETH(await rseth.getAddress());
    await lrtConfig.setContract(ethers.keccak256(ethers.toUtf8Bytes("LRT_ORACLE")), await lrtOracle.getAddress());
    await lrtConfig.addSupportedAsset(await asset.getAddress(), ethers.parseEther("1000"));
    
    // Initialize deposit pool
    await depositPool.initialize(await lrtConfig.getAddress());
    
    // Setup asset price in oracle
    await lrtOracle.setAssetPrice(await asset.getAddress(), ethers.parseEther("1"));
    await lrtOracle.setRSETHPrice(ethers.parseEther("1"));
    
    // Mint tokens to user and approve
    await asset.mint(await user.getAddress(), ethers.parseEther("100"));
    await asset.connect(user).approve(await depositPool.getAddress(), ethers.parseEther("100"));
    
    // Get initial deposit limit
    const initialLimit = await depositPool.getAssetCurrentLimit(await asset.getAddress());
    expect(initialLimit).to.equal(ethers.parseEther("1000"));
    
    // Deposit some tokens
    const depositAmount = ethers.parseEther("100");
    await depositPool.connect(user).depositAsset(await asset.getAddress(), depositAmount);
    
    // Get updated deposit limit
    const updatedLimit = await depositPool.getAssetCurrentLimit(await asset.getAddress());
    
    // If mutant is present, it will return the full limit (1000) instead of (1000 - 100 = 900)
    // Original contract should return 900
    expect(updatedLimit).to.equal(ethers.parseEther("900"));
    
    // Additional verification - deposit more to approach limit
    await asset.mint(await user.getAddress(), ethers.parseEther("900"));
    await asset.connect(user).approve(await depositPool.getAddress(), ethers.parseEther("900"));
    await depositPool.connect(user).depositAsset(await asset.getAddress(), ethers.parseEther("800"));
    
    const finalLimit = await depositPool.getAssetCurrentLimit(await asset.getAddress());
    expect(finalLimit).to.equal(ethers.parseEther("100"));
  });
});