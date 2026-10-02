import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("LRTDepositPool - Mutant m5ef3db04 detection", function () {
  let owner: SignerWithAddress;
  let user: SignerWithAddress;
  let lrtConfig: any;
  let lrtDepositPool: any;
  let mockAsset: any;
  let mockOracle: any;
  let mockRsETH: any;

  before(async function () {
    [owner, user] = await ethers.getSigners();

    // Deploy mock ERC20 token (the asset to deposit)
    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    mockAsset = await ERC20Mock.deploy("Mock Asset", "MASS", 18);
    await mockAsset.waitForDeployment();

    // Deploy mock rsETH token
    const ERC20Mock2 = await ethers.getContractFactory("ERC20Mock");
    mockRsETH = await ERC20Mock2.deploy("rsETH", "rsETH", 18);
    await mockRsETH.waitForDeployment();

    // Deploy mock oracle
    const LRTOracleMock = await ethers.getContractFactory("LRTOracleMock");
    mockOracle = await LRTOracleMock.deploy();
    await mockOracle.waitForDeployment();

    // Deploy LRTConfig mock
    const LRTConfigMock = await ethers.getContractFactory("LRTConfigMock");
    lrtConfig = await LRTConfigMock.deploy();
    await lrtConfig.waitForDeployment();

    // Setup config: set asset as supported, set deposit limit, set rsETH address, set oracle contract
    await lrtConfig.setSupportedAsset(await mockAsset.getAddress(), true);
    await lrtConfig.setDepositLimit(await mockAsset.getAddress(), ethers.parseEther("1000"));
    await lrtConfig.setRsETH(await mockRsETH.getAddress());
    await lrtConfig.setContract(ethers.keccak256(ethers.toUtf8Bytes("LRT_ORACLE")), await mockOracle.getAddress());

    // Deploy LRTDepositPool
    const Factory = await ethers.getContractFactory("LRTDepositPool");
    lrtDepositPool = await Factory.deploy();
    await lrtDepositPool.waitForDeployment();

    // Initialize the contract
    await lrtDepositPool.initialize(await lrtConfig.getAddress());

    // Grant MANAGER role to owner (for pause/unpause and transferAssetToNodeDelegator)
    const MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MANAGER"));
    await lrtConfig.grantRole(MANAGER_ROLE, owner.address);
  });

  it("should revert when user deposits without approving token transfer", async function () {
    // User has tokens but hasn't approved the deposit pool to spend them
    await mockAsset.mint(user.address, ethers.parseEther("10"));
    
    // Attempt deposit without approval - original contract would revert with TokenTransferFailed
    // Mutant would not revert, allowing the deposit to proceed without actual token transfer
    await expect(
      lrtDepositPool.connect(user).depositAsset(
        await mockAsset.getAddress(),
        ethers.parseEther("1")
      )
    ).to.be.reverted;
  });
});