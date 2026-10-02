import { expect } from "chai";
import { ethers } from "hardhat";

describe("LRTDepositPool - kill mutant m7aec71ac (division replaced with addition)", function () {
  it("should compute correct rsETH amount to mint using division, not addition", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy LRTDepositPool (constructor has no arguments, it calls _disableInitializers())
    const DepositPoolFactory = await ethers.getContractFactory("LRTDepositPool");
    const depositPool = await DepositPoolFactory.deploy();
    await depositPool.waitForDeployment();

    // Deploy a mock LRTConfig that will provide required values
    const LRTConfigFactory = await ethers.getContractFactory("LRTConfig");
    const lrtConfig = await LRTConfigFactory.deploy();
    await lrtConfig.waitForDeployment();

    // Deploy a mock LRTOracle that returns fixed prices
    const LRTOracleFactory = await ethers.getContractFactory("LRTOracle");
    const lrtOracle = await LRTOracleFactory.deploy();
    await lrtOracle.waitForDeployment();

    // Deploy a mock rsETH token
    const RSETHFactory = await ethers.getContractFactory("RSETH");
    const rsethToken = await RSETHFactory.deploy();
    await rsethToken.waitForDeployment();

    // Deploy a mock ERC20 asset
    const AssetFactory = await ethers.getContractFactory("ERC20Mock");
    const asset = await AssetFactory.deploy("Test Asset", "TST", 18);
    await asset.waitForDeployment();

    // Setup LRTConfig with required values
    // Set rsETH token address
    await lrtConfig.setRsETH(await rsethToken.getAddress());
    // Set LRT_ORACLE contract address
    const LRT_ORACLE_KEY = ethers.keccak256(ethers.toUtf8Bytes("LRT_ORACLE"));
    await lrtConfig.setContract(LRT_ORACLE_KEY, await lrtOracle.getAddress());
    // Add asset as supported with a deposit limit
    await lrtConfig.addNewSupportedAsset(await asset.getAddress(), ethers.parseEther("1000000"));

    // Initialize the deposit pool with the LRTConfig address
    await depositPool.initialize(await lrtConfig.getAddress());

    // Setup oracle prices: asset price = 2000 USDC, rsETH price = 1000 USDC
    await lrtOracle.setAssetPrice(await asset.getAddress(), ethers.parseEther("2000"));
    await lrtOracle.setRSETHPrice(ethers.parseEther("1000"));

    // Give user some tokens and approve deposit pool
    const depositAmount = ethers.parseEther("10");
    await asset.mint(await user.getAddress(), depositAmount);
    await asset.connect(user).approve(await depositPool.getAddress(), depositAmount);

    // Call getRsETHAmountToMint to check expected value
    // Expected: (10 * 2000) / 1000 = 20 rsETH
    const expectedRsethAmount = ethers.parseEther("20");

    const rsethAmount = await depositPool.connect(user).getRsETHAmountToMint(
      await asset.getAddress(),
      depositAmount
    );

    // The mutant would return (10 * 2000) + 1000 = 21000, so this assertion kills it
    expect(rsethAmount).to.equal(expectedRsethAmount);
  });
});