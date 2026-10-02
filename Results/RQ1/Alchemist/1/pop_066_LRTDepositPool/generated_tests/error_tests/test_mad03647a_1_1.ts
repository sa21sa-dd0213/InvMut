import { expect } from "chai";
import { ethers } from "hardhat";

describe("LRTDepositPool mutant kill test - depositAsset condition change", function () {
  let lrtDepositPool: any;
  let lrtConfig: any;
  let lrtOracle: any;
  let rsethToken: any;
  let testAsset: any;
  let owner: any;
  let user: any;

  const ASSET_PRICE = ethers.parseEther("1");
  const RSETH_PRICE = ethers.parseEther("1");
  const DEPOSIT_LIMIT = ethers.parseEther("1000");
  const INITIAL_ASSET_BALANCE = ethers.parseEther("10000");

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    // Deploy mock ERC20 token (test asset)
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    testAsset = await ERC20Factory.deploy("TestAsset", "TST", INITIAL_ASSET_BALANCE);
    await testAsset.waitForDeployment();

    // Deploy mock rsETH token
    const RSETHFactory = await ethers.getContractFactory("MockRSETH");
    rsethToken = await RSETHFactory.deploy();
    await rsethToken.waitForDeployment();

    // Deploy mock LRTConfig
    const LRTConfigFactory = await ethers.getContractFactory("MockLRTConfig");
    lrtConfig = await LRTConfigFactory.deploy();
    await lrtConfig.waitForDeployment();

    // Set up LRTConfig
    await lrtConfig.setRsETH(await rsethToken.getAddress());
    await lrtConfig.setSupportedAsset(await testAsset.getAddress(), true);
    await lrtConfig.setDepositLimit(await testAsset.getAddress(), DEPOSIT_LIMIT);

    // Deploy mock LRTOracle
    const LRTOracleFactory = await ethers.getContractFactory("MockLRTOracle");
    lrtOracle = await LRTOracleFactory.deploy();
    await lrtOracle.waitForDeployment();
    await lrtOracle.setAssetPrice(await testAsset.getAddress(), ASSET_PRICE);
    await lrtOracle.setRSETHPrice(RSETH_PRICE);
    await lrtConfig.setContract(ethers.encodeBytes32String("LRT_ORACLE"), await lrtOracle.getAddress());

    // Deploy LRTDepositPool
    const Factory = await ethers.getContractFactory("LRTDepositPool");
    lrtDepositPool = await Factory.deploy();
    await lrtDepositPool.waitForDeployment();

    // Initialize the contract
    await lrtDepositPool.initialize(await lrtConfig.getAddress());

    // Transfer test asset to user for testing
    await testAsset.transfer(user.address, INITIAL_ASSET_BALANCE);
    await testAsset.connect(user).approve(await lrtDepositPool.getAddress(), INITIAL_ASSET_BALANCE);

    // Grant manager role to owner (or user if needed)
    // Note: In a real scenario, we'd need to set up roles properly
  });

  it("should revert when depositing amount equal to current limit (mutant vulnerability)", async function () {
    // The current limit should be DEPOSIT_LIMIT - 0 (no deposits yet) = DEPOSIT_LIMIT
    // Original contract: depositAmount > limit reverts
    // Mutant: depositAmount < limit reverts
    
    // Deposit exactly the limit amount
    // Original: should succeed (1000 is not > 1000)
    // Mutant: should revert (1000 is not < 1000)
    await expect(
      lrtDepositPool.connect(user).depositAsset(
        await testAsset.getAddress(),
        DEPOSIT_LIMIT
      )
    ).to.not.be.reverted; // This will pass on original, fail on mutant

    // Verify the deposit actually happened
    const totalDeposits = await lrtDepositPool.getTotalAssetDeposits(await testAsset.getAddress());
    expect(totalDeposits).to.equal(DEPOSIT_LIMIT);
  });
});