import { expect } from "chai";
import { ethers } from "hardhat";

describe("LRTDepositPool - Kill mutant m763c4a40 (remove nonReentrant)", function () {
  let lrtDepositPool: any;
  let lrtConfig: any;
  let rsethToken: any;
  let lrtOracle: any;
  let assetToken: any;
  let owner: any;
  let user: any;
  let attacker: any;
  let nodeDelegator: any;

  beforeEach(async function () {
    [owner, user, attacker, nodeDelegator] = await ethers.getSigners();

    // Deploy mock tokens and contracts
    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    assetToken = await ERC20Mock.deploy("Asset", "AST", 18);
    await assetToken.waitForDeployment();

    const RSETHMock = await ethers.getContractFactory("RSETHMock");
    rsethToken = await RSETHMock.deploy();
    await rsethToken.waitForDeployment();

    const LRTConfigMock = await ethers.getContractFactory("LRTConfigMock");
    lrtConfig = await LRTConfigMock.deploy();
    await lrtConfig.waitForDeployment();

    const LRTOracleMock = await ethers.getContractFactory("LRTOracleMock");
    lrtOracle = await LRTOracleMock.deploy();
    await lrtOracle.waitForDeployment();

    // Setup LRTConfig
    await lrtConfig.setContract(ethers.encodeBytes32String("LRT_ORACLE"), await lrtOracle.getAddress());
    await lrtConfig.setRsETH(await rsethToken.getAddress());
    await lrtConfig.setSupportedAsset(await assetToken.getAddress(), ethers.parseEther("1000000"));
    await lrtConfig.grantRole(ethers.ZeroHash, owner.address); // admin role
    await lrtConfig.grantRole(ethers.encodeBytes32String("MANAGER"), owner.address);

    // Deploy LRTDepositPool
    const Factory = await ethers.getContractFactory("LRTDepositPool");
    lrtDepositPool = await Factory.deploy();
    await lrtDepositPool.waitForDeployment();

    await lrtDepositPool.initialize(await lrtConfig.getAddress());

    // Add a node delegator
    await lrtDepositPool.addNodeDelegatorContractToQueue([nodeDelegator.address]);

    // Fund user with asset tokens
    await assetToken.mint(user.address, ethers.parseEther("1000"));
    await assetToken.connect(user).approve(await lrtDepositPool.getAddress(), ethers.parseEther("1000"));

    // Fund attacker with asset tokens
    await assetToken.mint(attacker.address, ethers.parseEther("1000"));
    await assetToken.connect(attacker).approve(await lrtDepositPool.getAddress(), ethers.parseEther("1000"));
  });

  it("should revert on reentrant call to depositAsset when nonReentrant is present (kill mutant)", async function () {
    // Deploy a malicious contract that reenters depositAsset
    const ReentrancyAttacker = await ethers.getContractFactory("ReentrancyAttacker");
    const attackerContract = await ReentrancyAttacker.deploy(
      await lrtDepositPool.getAddress(),
      await assetToken.getAddress()
    );
    await attackerContract.waitForDeployment();

    // Fund attacker contract with tokens
    await assetToken.mint(await attackerContract.getAddress(), ethers.parseEther("100"));
    await assetToken.connect(attackerContract).approve(
      await lrtDepositPool.getAddress(),
      ethers.parseEther("100")
    );

    // The attacker contract will call depositAsset, and during the mint callback, it reenters depositAsset
    // With nonReentrant, this should revert
    await expect(
      attackerContract.connect(attacker).attack(ethers.parseEther("10"))
    ).to.be.revertedWith("ReentrancyGuard: reentrant call");
  });
});