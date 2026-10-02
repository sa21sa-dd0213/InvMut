import { expect } from "chai";
import { ethers } from "hardhat";

describe("LRTDepositPool - Mutant m277304ff Test", function () {
  it("should detect mutant that removes subtraction in getAssetCurrentLimit", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy LRTDepositPool
    const LRTDepositPoolFactory = await ethers.getContractFactory("LRTDepositPool");
    const depositPool = await LRTDepositPoolFactory.deploy();
    await depositPool.waitForDeployment();

    // Deploy mock contracts for dependencies
    const LRTConfigFactory = await ethers.getContractFactory("LRTConfig");
    const lrtConfig = await LRTConfigFactory.deploy();
    await lrtConfig.waitForDeployment();

    const RSETHFactory = await ethers.getContractFactory("RSETH");
    const rseth = await RSETHFactory.deploy();
    await rseth.waitForDeployment();

    const LRTOracleFactory = await ethers.getContractFactory("LRTOracle");
    const lrtOracle = await LRTOracleFactory.deploy();
    await lrtOracle.waitForDeployment();

    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    const mockAsset = await MockERC20Factory.deploy("MockAsset", "MA", ethers.parseEther("1000000"));
    await mockAsset.waitForDeployment();

    // Setup: initialize deposit pool with LRT config
    await lrtConfig.setRSETH(await rseth.getAddress());
    await lrtConfig.setContract(ethers.keccak256(ethers.toUtf8Bytes("LRT_ORACLE")), await lrtOracle.getAddress());
    await lrtConfig.setSupportedAsset(await mockAsset.getAddress(), ethers.parseEther("1000"));
    
    // Grant admin role to owner
    const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;
    await lrtConfig.grantRole(DEFAULT_ADMIN_ROLE, owner.address);
    
    await depositPool.connect(owner).initialize(await lrtConfig.getAddress());

    // Set oracle prices
    await lrtOracle.setAssetPrice(await mockAsset.getAddress(), ethers.parseEther("1"));
    await lrtOracle.setRSETHPrice(ethers.parseEther("1"));

    // Get initial deposit limit
    const initialLimit = await depositPool.getAssetCurrentLimit(await mockAsset.getAddress());
    expect(initialLimit).to.equal(ethers.parseEther("1000"));

    // Deposit some tokens to increase total deposits
    await mockAsset.connect(owner).approve(await depositPool.getAddress(), ethers.parseEther("500"));
    await depositPool.connect(owner).depositAsset(await mockAsset.getAddress(), ethers.parseEther("500"));

    // After deposit, the limit should decrease by 500
    const afterDepositLimit = await depositPool.getAssetCurrentLimit(await mockAsset.getAddress());
    
    // Original behavior: limit = 1000 - 500 = 500
    // Mutant behavior (if subtraction removed): limit = 1000 (unchanged)
    expect(afterDepositLimit).to.equal(ethers.parseEther("500"));
  });
});