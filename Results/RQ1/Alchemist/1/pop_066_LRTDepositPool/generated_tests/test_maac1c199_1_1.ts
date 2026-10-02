import { expect } from "chai";
import { ethers } from "hardhat";

describe("LRTDepositPool - kill mutant maac1c199 (depositAsset zero check inversion)", function () {
  it("should successfully deposit a non-zero amount of an asset (mutant would revert)", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy mock ERC20 token for testing
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    const mockToken = await ERC20Factory.deploy("Test Token", "TST", ethers.parseEther("1000000"));
    await mockToken.waitForDeployment();

    // Deploy LRTConfig mock (simplified for testing)
    const LRTConfigFactory = await ethers.getContractFactory("MockLRTConfig");
    const mockConfig = await LRTConfigFactory.deploy();
    await mockConfig.waitForDeployment();

    // Configure mock to support our test asset
    await mockConfig.setSupportedAsset(await mockToken.getAddress(), true);
    await mockConfig.setDepositLimit(await mockToken.getAddress(), ethers.parseEther("1000000"));

    // Deploy mock RSETH token
    const RSETHFactory = await ethers.getContractFactory("MockRSETH");
    const mockRseth = await RSETHFactory.deploy("rsETH", "rsETH");
    await mockRseth.waitForDeployment();
    await mockConfig.setRsETH(await mockRseth.getAddress());

    // Deploy mock LRT Oracle
    const OracleFactory = await ethers.getContractFactory("MockLRTOracle");
    const mockOracle = await OracleFactory.deploy();
    await mockOracle.waitForDeployment();
    await mockConfig.setContract(ethers.keccak256(ethers.toUtf8Bytes("LRT_ORACLE")), await mockOracle.getAddress());

    // Set oracle prices
    await mockOracle.setAssetPrice(await mockToken.getAddress(), ethers.parseEther("1"));
    await mockOracle.setRSETHPrice(ethers.parseEther("1"));

    // Deploy LRTDepositPool
    const Factory = await ethers.getContractFactory("LRTDepositPool");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize with config
    await instance.initialize(await mockConfig.getAddress());

    // Give owner some tokens and approve deposit pool
    const depositAmount = ethers.parseEther("100");
    await mockToken.transfer(addr1.address, depositAmount);
    await mockToken.connect(addr1).approve(await instance.getAddress(), depositAmount);

    // This transaction should succeed on original contract
    // Mutant would revert because depositAmount != 0 triggers the revert
    await expect(
      instance.connect(addr1).depositAsset(await mockToken.getAddress(), depositAmount)
    ).to.not.be.reverted;
  });
});