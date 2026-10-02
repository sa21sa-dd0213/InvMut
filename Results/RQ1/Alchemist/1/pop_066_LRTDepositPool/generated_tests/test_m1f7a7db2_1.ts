import { expect } from "chai";
import { ethers } from "hardhat";

describe("LRTDepositPool mutant detection - event emission", function () {
  it("should detect missing AssetDeposit event emission by expecting the event to be emitted", async function () {
    const [owner, depositor] = await ethers.getSigners();
    
    // Deploy LRTDepositPool (constructor has no arguments based on the code)
    const LRTDepositPoolFactory = await ethers.getContractFactory("LRTDepositPool");
    const depositPool = await LRTDepositPoolFactory.deploy();
    await depositPool.waitForDeployment();
    
    // We need to set up the contract dependencies properly
    // Deploy mock contracts for testing
    const LRTConfigFactory = await ethers.getContractFactory("LRTConfig");
    const lrtConfig = await LRTConfigFactory.deploy();
    await lrtConfig.waitForDeployment();
    
    const RSETHFactory = await ethers.getContractFactory("RSETH");
    const rseth = await RSETHFactory.deploy();
    await rseth.waitForDeployment();
    
    const LRTOracleFactory = await ethers.getContractFactory("LRTOracle");
    const lrtOracle = await LRTOracleFactory.deploy();
    await lrtOracle.waitForDeployment();
    
    // Initialize the deposit pool
    await depositPool.initialize(await lrtConfig.getAddress());
    
    // Configure LRT config
    await lrtConfig.setRSETH(await rseth.getAddress());
    await lrtConfig.setContract(ethers.encodeBytes32String("LRT_ORACLE"), await lrtOracle.getAddress());
    
    // Add a supported asset (mock ERC20)
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    const mockAsset = await MockERC20Factory.deploy("Test Asset", "TST", 18);
    await mockAsset.waitForDeployment();
    
    await lrtConfig.addSupportedAsset(await mockAsset.getAddress(), ethers.parseEther("1000"));
    
    // Setup oracle price
    await lrtOracle.setAssetPrice(await mockAsset.getAddress(), ethers.parseEther("1"));
    await lrtOracle.setRSETHPrice(ethers.parseEther("1"));
    
    // Fund depositor with tokens
    await mockAsset.mint(await depositor.getAddress(), ethers.parseEther("100"));
    await mockAsset.connect(depositor).approve(await depositPool.getAddress(), ethers.parseEther("100"));
    
    // Perform deposit and expect AssetDeposit event
    const depositAmount = ethers.parseEther("10");
    await expect(
      depositPool.connect(depositor).depositAsset(await mockAsset.getAddress(), depositAmount)
    )
      .to.emit(depositPool, "AssetDeposit")
      .withArgs(await mockAsset.getAddress(), depositAmount, ethers.parseEther("10"));
    
    // Verify the deposit was processed (balance check)
    const balance = await mockAsset.balanceOf(await depositPool.getAddress());
    expect(balance).to.equal(depositAmount);
  });
});