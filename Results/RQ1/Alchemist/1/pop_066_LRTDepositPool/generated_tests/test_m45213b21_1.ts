import { expect } from "chai";
import { ethers } from "hardhat";

describe("LRTDepositPool mutant m45213b21 test", function () {
  it("should kill mutant by depositing a valid amount below the current limit", async function () {
    const [owner, addr1] = await ethers.getSigners();

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

    // Setup LRTConfig
    await lrtConfig.setContract(ethers.encodeBytes32String("LRT_ORACLE"), await lrtOracle.getAddress());
    await lrtConfig.setContract(ethers.encodeBytes32String("RSETH"), await rseth.getAddress());

    // Deploy LRTDepositPool
    const LRTDepositPoolFactory = await ethers.getContractFactory("LRTDepositPool");
    const depositPool = await LRTDepositPoolFactory.deploy();
    await depositPool.waitForDeployment();

    // Initialize the deposit pool
    await depositPool.initialize(await lrtConfig.getAddress());

    // Setup a supported asset (e.g., a mock ERC20)
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    const asset = await MockERC20Factory.deploy("TestAsset", "TST", 18);
    await asset.waitForDeployment();

    // Configure asset in LRTConfig
    await lrtConfig.addNewSupportedAsset(await asset.getAddress(), ethers.parseEther("10000"));

    // Setup asset price in oracle
    await lrtOracle.setAssetPrice(await asset.getAddress(), ethers.parseEther("1"));
    await lrtOracle.setRSETHPrice(ethers.parseEther("1"));

    // Mint tokens to addr1 and approve depositPool
    await asset.mint(addr1.address, ethers.parseEther("100"));
    await asset.connect(addr1).approve(await depositPool.getAddress(), ethers.parseEther("100"));

    // Attempt to deposit a valid amount (10 tokens) which should succeed on original
    // but revert on mutant due to the always-true condition
    await expect(
      depositPool.connect(addr1).depositAsset(await asset.getAddress(), ethers.parseEther("10"))
    ).to.be.revertedWith("MaximumDepositLimitReached");
  });
});