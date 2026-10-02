import { expect } from "chai";
import { ethers } from "hardhat";

describe("LRTDepositPool mutant m1b6e5741 - depositAsset TokenTransferFailed revert", function () {
  let lrtDepositPool: any;
  let lrtConfig: any;
  let lrtOracle: any;
  let rsethToken: any;
  let assetToken: any;
  let owner: any;
  let user: any;
  let nodeDelegator: any;

  beforeEach(async function () {
    [owner, user, nodeDelegator] = await ethers.getSigners();

    // Deploy mock tokens and contracts needed for LRTDepositPool
    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    assetToken = await ERC20Mock.deploy("TestAsset", "TST", ethers.parseEther("1000000"));
    await assetToken.waitForDeployment();

    const RSETHMock = await ethers.getContractFactory("ERC20Mock");
    rsethToken = await RSETHMock.deploy("rsETH", "rsETH", ethers.parseEther("1000000"));
    await rsethToken.waitForDeployment();

    // Deploy LRTConfig
    const LRTConfig = await ethers.getContractFactory("LRTConfig");
    lrtConfig = await LRTConfig.deploy();
    await lrtConfig.waitForDeployment();

    // Deploy LRTOracle
    const LRTOracle = await ethers.getContractFactory("LRTOracle");
    lrtOracle = await LRTOracle.deploy();
    await lrtOracle.waitForDeployment();

    // Configure LRTConfig
    await lrtConfig.setContract(ethers.keccak256(ethers.toUtf8Bytes("LRT_ORACLE")), await lrtOracle.getAddress());
    await lrtConfig.setContract(ethers.keccak256(ethers.toUtf8Bytes("R_ETH_TOKEN")), await rsethToken.getAddress());
    await lrtConfig.setRSETH(await rsethToken.getAddress());
    await lrtConfig.addNewSupportedAsset(await assetToken.getAddress(), ethers.parseEther("1000000"));

    // Grant MANAGER role to owner
    await lrtConfig.grantRole(ethers.keccak256(ethers.toUtf8Bytes("MANAGER")), owner.address);

    // Deploy LRTDepositPool
    const LRTDepositPool = await ethers.getContractFactory("LRTDepositPool");
    lrtDepositPool = await LRTDepositPool.deploy();
    await lrtDepositPool.waitForDeployment();

    // Initialize LRTDepositPool
    await lrtDepositPool.initialize(await lrtConfig.getAddress());

    // Add node delegator
    await lrtDepositPool.addNodeDelegatorContractToQueue([await nodeDelegator.getAddress()]);

    // Setup oracle price
    await lrtOracle.setAssetPrice(await assetToken.getAddress(), ethers.parseEther("1"));
    await lrtOracle.setRSETHPrice(ethers.parseEther("1"));
  });

  it("should revert when token transfer from user fails due to insufficient allowance", async function () {
    // User has tokens but hasn't approved the deposit pool
    await assetToken.transfer(user.address, ethers.parseEther("100"));

    // Attempt to deposit without approval - should revert with TokenTransferFailed
    await expect(
      lrtDepositPool.connect(user).depositAsset(
        await assetToken.getAddress(),
        ethers.parseEther("10")
      )
    ).to.be.revertedWith("TokenTransferFailed");
  });

  it("should revert when token transfer from user fails due to insufficient balance", async function () {
    // User has no tokens but tries to deposit
    await expect(
      lrtDepositPool.connect(user).depositAsset(
        await assetToken.getAddress(),
        ethers.parseEther("10")
      )
    ).to.be.revertedWith("TokenTransferFailed");
  });
});