import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("LRTDepositPool - Kill mutant mb6a2b633 (transferAssetToNodeDelegator revert removal)", function () {
  let owner: SignerWithAddress;
  let manager: SignerWithAddress;
  let lrtConfig: any;
  let lrtDepositPool: any;
  let mockERC20: any;
  let nodeDelegator: any;
  let lrtOracle: any;
  let rsethToken: any;

  beforeEach(async function () {
    [owner, manager] = await ethers.getSigners();

    // Deploy mock ERC20 token
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    mockERC20 = await ERC20Factory.deploy("Test Token", "TST", ethers.parseEther("1000000"));
    await mockERC20.waitForDeployment();

    // Deploy mock LRTConfig
    const LRTConfigFactory = await ethers.getContractFactory("MockLRTConfig");
    lrtConfig = await LRTConfigFactory.deploy();
    await lrtConfig.waitForDeployment();

    // Deploy mock NodeDelegator
    const NodeDelegatorFactory = await ethers.getContractFactory("MockNodeDelegator");
    nodeDelegator = await NodeDelegatorFactory.deploy();
    await nodeDelegator.waitForDeployment();

    // Deploy mock LRTOracle
    const LRTOracleFactory = await ethers.getContractFactory("MockLRTOracle");
    lrtOracle = await LRTOracleFactory.deploy();
    await lrtOracle.waitForDeployment();

    // Deploy mock rsETH token
    const RSETHFactory = await ethers.getContractFactory("MockRSETH");
    rsethToken = await RSETHFactory.deploy();
    await rsethToken.waitForDeployment();

    // Configure LRTConfig
    await lrtConfig.setContract(ethers.encodeBytes32String("LRT_ORACLE"), await lrtOracle.getAddress());
    await lrtConfig.setContract(ethers.encodeBytes32String("R_ETH_TOKEN"), await rsethToken.getAddress());
    await lrtConfig.setRsETH(await rsethToken.getAddress());
    await lrtConfig.addSupportedAsset(await mockERC20.getAddress(), ethers.parseEther("100000"));
    await lrtConfig.grantRole(ethers.encodeBytes32String("MANAGER"), manager.address);

    // Deploy LRTDepositPool
    const Factory = await ethers.getContractFactory("LRTDepositPool");
    lrtDepositPool = await Factory.deploy();
    await lrtDepositPool.waitForDeployment();

    // Initialize LRTDepositPool
    await lrtDepositPool.initialize(await lrtConfig.getAddress());

    // Add node delegator to queue
    await lrtDepositPool.addNodeDelegatorContractToQueue([await nodeDelegator.getAddress()]);

    // Fund the deposit pool with some tokens
    await mockERC20.transfer(await lrtDepositPool.getAddress(), ethers.parseEther("100"));
  });

  it("should revert when transfer to node delegator fails (mutant removes revert)", async function () {
    // Set up node delegator to fail transfers
    await nodeDelegator.setShouldFailTransfer(true);

    // Attempt to transfer asset to node delegator - should revert in original
    await expect(
      lrtDepositPool.connect(manager).transferAssetToNodeDelegator(
        0,
        await mockERC20.getAddress(),
        ethers.parseEther("10")
      )
    ).to.be.revertedWith("TokenTransferFailed");
  });
});