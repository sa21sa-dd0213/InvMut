import { expect } from "chai";
import { ethers } from "hardhat";

describe("LRTDepositPool - kill mutant m205b4ef2", function () {
  it("should revert when depositing amount exceeding asset deposit limit", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy LRTConfig mock or actual contract
    const LRTConfigFactory = await ethers.getContractFactory("LRTConfig");
    const lrtConfig = await LRTConfigFactory.deploy();
    await lrtConfig.waitForDeployment();

    // Deploy RSETH token
    const RSETHFactory = await ethers.getContractFactory("RSETH");
    const rseth = await RSETHFactory.deploy();
    await rseth.waitForDeployment();

    // Deploy LRTOracle
    const LRTOracleFactory = await ethers.getContractFactory("LRTOracle");
    const lrtOracle = await LRTOracleFactory.deploy();
    await lrtOracle.waitForDeployment();

    // Deploy a mock ERC20 asset
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    const mockAsset = await MockERC20Factory.deploy("Mock", "MCK", 18);
    await mockAsset.waitForDeployment();

    // Deploy LRTDepositPool
    const LRTDepositPoolFactory = await ethers.getContractFactory("LRTDepositPool");
    const depositPool = await LRTDepositPoolFactory.deploy();
    await depositPool.waitForDeployment();

    // Initialize the deposit pool
    await depositPool.initialize(await lrtConfig.getAddress());

    // Configure LRTConfig with required settings
    await lrtConfig.setRSETH(await rseth.getAddress());
    await lrtConfig.setContract(ethers.encodeBytes32String("LRT_ORACLE"), await lrtOracle.getAddress());
    await lrtConfig.addNewSupportedAsset(await mockAsset.getAddress(), ethers.parseEther("1000"));

    // Set asset price in oracle
    await lrtOracle.setAssetPrice(await mockAsset.getAddress(), ethers.parseEther("1"));
    await lrtOracle.setRSETHPrice(ethers.parseEther("1"));

    // Mint tokens to addr1 and approve deposit pool
    await mockAsset.mint(addr1.address, ethers.parseEther("100"));
    await mockAsset.connect(addr1).approve(await depositPool.getAddress(), ethers.parseEther("100"));

    // First deposit within limit should succeed
    await depositPool.connect(addr1).depositAsset(await mockAsset.getAddress(), ethers.parseEther("50"));

    // Now try to deposit more than the remaining limit (950 remaining, try 600)
    await expect(
      depositPool.connect(addr1).depositAsset(await mockAsset.getAddress(), ethers.parseEther("600"))
    ).to.be.revertedWithCustomError(depositPool, "MaximumDepositLimitReached");
  });
});