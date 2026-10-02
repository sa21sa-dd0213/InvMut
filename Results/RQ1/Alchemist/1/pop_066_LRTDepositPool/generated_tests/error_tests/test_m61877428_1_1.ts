import { expect } from "chai";
import { ethers } from "hardhat";

describe("LRTDepositPool mutant kill test", function () {
  it("should kill mutant m61877428 by depositing a non-zero amount and expecting success", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy mock ERC20 asset
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockAsset = await MockERC20.deploy("MockAsset", "MA", ethers.parseEther("1000000"));
    await mockAsset.waitForDeployment();

    // Deploy mock LRTConfig
    const LRTConfig = await ethers.getContractFactory("LRTConfig");
    const lrtConfig = await LRTConfig.deploy();
    await lrtConfig.waitForDeployment();

    // Configure LRTConfig: set rsETH address (deploy mock)
    const MockRSETH = await ethers.getContractFactory("MockRSETH");
    const mockRseth = await MockRSETH.deploy("rsETH", "rsETH", ethers.parseEther("1000000"));
    await mockRseth.waitForDeployment();
    await lrtConfig.setToken(ethers.encodeBytes32String("R_ETH_TOKEN"), await mockRseth.getAddress());

    // Set oracle address (deploy mock oracle)
    const MockLRTOracle = await ethers.getContractFactory("MockLRTOracle");
    const mockOracle = await MockLRTOracle.deploy();
    await mockOracle.waitForDeployment();
    await lrtConfig.setContract(ethers.encodeBytes32String("LRT_ORACLE"), await mockOracle.getAddress());

    // Set asset as supported with deposit limit
    const depositLimit = ethers.parseEther("10000");
    await lrtConfig.addNewSupportedAsset(await mockAsset.getAddress(), depositLimit);

    // Deploy LRTDepositPool
    const Factory = await ethers.getContractFactory("LRTDepositPool");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the pool with LRTConfig address
    await instance.initialize(await lrtConfig.getAddress());

    // Fund user with mock asset and approve pool
    const depositAmount = ethers.parseEther("100");
    await mockAsset.transfer(user.address, depositAmount);
    await mockAsset.connect(user).approve(await instance.getAddress(), depositAmount);

    // Set oracle prices so getRsETHAmountToMint works
    await mockOracle.setAssetPrice(await mockAsset.getAddress(), ethers.parseEther("1"));
    await mockOracle.setRSETHPrice(ethers.parseEther("1"));

    // This call should succeed on original contract (non-zero deposit)
    // but will revert on the mutant because condition becomes `if (true)`
    await expect(
      instance.connect(user).depositAsset(await mockAsset.getAddress(), depositAmount)
    ).to.not.be.reverted;

    // Additional verification: check deposit was processed
    const totalDeposits = await instance.getTotalAssetDeposits(await mockAsset.getAddress());
    expect(totalDeposits).to.equal(depositAmount);
  });
});