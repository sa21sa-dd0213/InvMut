import { expect } from "chai";
import { ethers } from "hardhat";

describe("LRTDepositPool - kill mutant meabf6995 (division replaced by subtraction in getRsETHAmountToMint)", function () {
  let lrtDepositPool: any;
  let lrtConfig: any;
  let lrtOracle: any;
  let rsethToken: any;
  let assetToken: any;
  let owner: any;
  let addr1: any;
  let manager: any;

  const ASSET_PRICE = ethers.parseEther("1500"); // $1500 per token
  const RSETH_PRICE = ethers.parseEther("2000"); // $2000 per rsETH
  const DEPOSIT_AMOUNT = ethers.parseEther("10"); // 10 tokens deposited

  before(async function () {
    [owner, addr1, manager] = await ethers.getSigners();

    // Deploy mock ERC20 for asset
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    assetToken = await ERC20Factory.deploy("Test Asset", "TST", 18);
    await assetToken.waitForDeployment();

    // Deploy mock rsETH
    const RSETHFactory = await ethers.getContractFactory("MockRSETH");
    rsethToken = await RSETHFactory.deploy();
    await rsethToken.waitForDeployment();

    // Deploy mock LRT Oracle
    const LRTOracleFactory = await ethers.getContractFactory("MockLRTOracle");
    lrtOracle = await LRTOracleFactory.deploy();
    await lrtOracle.waitForDeployment();

    // Set asset price in oracle
    await lrtOracle.setAssetPrice(await assetToken.getAddress(), ASSET_PRICE);
    await lrtOracle.setRSETHPrice(RSETH_PRICE);

    // Deploy mock LRT Config
    const LRTConfigFactory = await ethers.getContractFactory("MockLRTConfig");
    lrtConfig = await LRTConfigFactory.deploy();
    await lrtConfig.waitForDeployment();

    // Configure LRT Config
    await lrtConfig.setRsETH(await rsethToken.getAddress());
    await lrtConfig.setContract(ethers.keccak256(ethers.toUtf8Bytes("LRT_ORACLE")), await lrtOracle.getAddress());
    await lrtConfig.addSupportedAsset(await assetToken.getAddress(), ethers.parseEther("1000000"));
    await lrtConfig.grantRole(ethers.keccak256(ethers.toUtf8Bytes("MANAGER")), manager.address);

    // Deploy LRTDepositPool
    const LRTDepositPoolFactory = await ethers.getContractFactory("LRTDepositPool");
    lrtDepositPool = await LRTDepositPoolFactory.deploy();
    await lrtDepositPool.waitForDeployment();

    // Initialize
    await lrtDepositPool.initialize(await lrtConfig.getAddress());
  });

  it("should calculate correct rsETH amount using division (original) and fail with subtraction (mutant)", async function () {
    // Calculate expected rsETH amount using original formula: (amount * assetPrice) / rsETHPrice
    const expectedRsETHAmount = (DEPOSIT_AMOUNT * ASSET_PRICE) / RSETH_PRICE;

    // Call getRsETHAmountToMint
    const actualRsETHAmount = await lrtDepositPool.getRsETHAmountToMint(
      await assetToken.getAddress(),
      DEPOSIT_AMOUNT
    );

    // If the mutant is present (subtraction instead of division), this will fail
    // Mutant would compute: (10 * 1500) - 2000 = 13000, which is wrong
    // Original computes: (10 * 1500) / 2000 = 7.5
    expect(actualRsETHAmount).to.equal(expectedRsETHAmount);
  });
});