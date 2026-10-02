import { expect } from "chai";
import { ethers } from "hardhat";

describe("LRTDepositPool mutant detection - depositAsset zero amount", function () {
  let lrtDepositPool: any;
  let lrtConfig: any;
  let lrtOracle: any;
  let rsethToken: any;
  let assetToken: any;
  let owner: any;
  let user: any;

  before(async function () {
    [owner, user] = await ethers.getSigners();

    // Deploy mock ERC20 token for asset
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    assetToken = await MockERC20.deploy("Test Asset", "TST", 18);
    await assetToken.waitForDeployment();

    // Deploy mock RSETH token
    const MockRSETH = await ethers.getContractFactory("MockRSETH");
    rsethToken = await MockRSETH.deploy("rsETH", "RSETH", 18);
    await rsethToken.waitForDeployment();

    // Deploy mock LRT Oracle
    const MockLRTOracle = await ethers.getContractFactory("MockLRTOracle");
    lrtOracle = await MockLRTOracle.deploy();
    await lrtOracle.waitForDeployment();

    // Deploy mock LRT Config
    const MockLRTConfig = await ethers.getContractFactory("MockLRTConfig");
    lrtConfig = await MockLRTConfig.deploy();
    await lrtConfig.waitForDeployment();

    // Setup LRT Config
    await lrtConfig.setRsETH(await rsethToken.getAddress());
    await lrtConfig.setContract(ethers.keccak256(ethers.toUtf8Bytes("LRT_ORACLE")), await lrtOracle.getAddress());
    await lrtConfig.addSupportedAsset(await assetToken.getAddress(), ethers.parseEther("1000"));
    
    // Grant MANAGER role to owner
    const MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MANAGER"));
    await lrtConfig.grantRole(MANAGER_ROLE, owner.address);

    // Deploy LRTDepositPool
    const LRTDepositPoolFactory = await ethers.getContractFactory("LRTDepositPool");
    lrtDepositPool = await LRTDepositPoolFactory.deploy();
    await lrtDepositPool.waitForDeployment();

    // Initialize the contract
    await lrtDepositPool.initialize(await lrtConfig.getAddress());
  });

  it("should revert when depositing zero amount", async function () {
    // Give user some tokens
    await assetToken.mint(user.address, ethers.parseEther("10"));
    
    // Approve deposit pool to spend tokens
    await assetToken.connect(user).approve(await lrtDepositPool.getAddress(), ethers.parseEther("10"));

    // Attempt to deposit zero amount - should revert on original but pass on mutant
    await expect(
      lrtDepositPool.connect(user).depositAsset(await assetToken.getAddress(), 0)
    ).to.be.revertedWith("InvalidAmount");
  });
});