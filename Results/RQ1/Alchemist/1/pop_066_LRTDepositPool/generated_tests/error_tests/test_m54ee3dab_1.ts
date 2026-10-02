import { expect } from "chai";
import { ethers } } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { LRTDepositPool, ILRTConfig, ILRTOracle, IRSETH } from "../typechain-types";

describe("LRTDepositPool - getRsETHAmountToMint mutant detection", function () {
  let owner: SignerWithAddress;
  let user: SignerWithAddress;
  let lrtDepositPool: LRTDepositPool;
  let lrtConfig: ILRTConfig;
  let lrtOracle: ILRTOracle;
  let rsethToken: IRSETH;
  let mockAsset: string;

  const ASSET_PRICE = ethers.parseEther("1.5");
  const RSETH_PRICE = ethers.parseEther("1.0");
  const DEPOSIT_AMOUNT = ethers.parseEther("10");

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    // Deploy mock LRTConfig
    const LRTConfigFactory = await ethers.getContractFactory("MockLRTConfig");
    lrtConfig = await LRTConfigFactory.deploy();
    await lrtConfig.waitForDeployment();

    // Deploy mock LRTOracle
    const LRTOracleFactory = await ethers.getContractFactory("MockLRTOracle");
    lrtOracle = await LRTOracleFactory.deploy();
    await lrtOracle.waitForDeployment();

    // Set up mock asset and prices
    mockAsset = await lrtConfig.getSupportedAssetList().then(list => list[0]);
    await lrtOracle.setAssetPrice(mockAsset, ASSET_PRICE);
    await lrtOracle.setRSETHPrice(RSETH_PRICE);

    // Deploy LRTDepositPool
    const LRTDepositPoolFactory = await ethers.getContractFactory("LRTDepositPool");
    lrtDepositPool = await LRTDepositPoolFactory.deploy();
    await lrtDepositPool.waitForDeployment();

    // Initialize
    await lrtDepositPool.initialize(await lrtConfig.getAddress());

    // Deploy mock rsETH token
    const RSETHFactory = await ethers.getContractFactory("MockRSETH");
    rsethToken = await RSETHFactory.deploy();
    await rsethToken.waitForDeployment();

    // Set rsETH in config
    await lrtConfig.setRsETH(await rsethToken.getAddress());

    // Set LRT Oracle contract address in config
    await lrtConfig.setContract(ethers.keccak256(ethers.toUtf8Bytes("LRT_ORACLE")), await lrtOracle.getAddress());

    // Fund user with asset tokens
    const assetToken = await ethers.getContractAt("IERC20", mockAsset);
    await assetToken.transfer(user.address, DEPOSIT_AMOUNT * 2n);
  });

  it("should revert when minted rsETH amount does not match expected calculation", async function () {
    // Calculate expected rsETH amount using multiplication formula
    const expectedRsethAmount = (DEPOSIT_AMOUNT * ASSET_PRICE) / RSETH_PRICE;

    // Approve deposit pool to spend user's asset
    const assetToken = await ethers.getContractAt("IERC20", mockAsset);
    await assetToken.connect(user).approve(await lrtDepositPool.getAddress(), DEPOSIT_AMOUNT);

    // Perform deposit
    const tx = await lrtDepositPool.connect(user).depositAsset(mockAsset, DEPOSIT_AMOUNT);
    await tx.wait();

    // Check user's rsETH balance
    const userRsethBalance = await rsethToken.balanceOf(user.address);

    // If mutant uses addition instead of multiplication, the result will be different
    // Expected: (10 * 1.5) / 1.0 = 15
    // Mutant: (10 + 1.5) / 1.0 = 11.5
    // So the balance should NOT equal the mutant's calculation
    expect(userRsethBalance).to.equal(expectedRsethAmount);
  });
});