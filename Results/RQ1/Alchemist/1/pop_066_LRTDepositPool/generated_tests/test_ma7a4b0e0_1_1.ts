import { expect } from "chai";
import { ethers } from "hardhat";

describe("LRTDepositPool - Reentrancy Guard on transferAssetToNodeDelegator", function () {
  it("should prevent reentrant calls to transferAssetToNodeDelegator (nonReentrant modifier test)", async function () {
    const [owner, manager, attacker] = await ethers.getSigners();
    
    // Deploy LRTDepositPool with required constructor arguments
    const LRTDepositPoolFactory = await ethers.getContractFactory("LRTDepositPool");
    const depositPool = await LRTDepositPoolFactory.deploy();
    await depositPool.waitForDeployment();
    
    // Deploy mock contracts for LRTConfig, ERC20 token, and NodeDelegator
    const LRTConfigFactory = await ethers.getContractFactory("LRTConfig");
    const lrtConfig = await LRTConfigFactory.deploy();
    await lrtConfig.waitForDeployment();
    
    const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
    const testAsset = await ERC20Factory.deploy("Test Asset", "TST", ethers.parseEther("1000000"));
    await testAsset.waitForDeployment();
    
    const NodeDelegatorFactory = await ethers.getContractFactory("NodeDelegatorMock");
    const nodeDelegator = await NodeDelegatorFactory.deploy();
    await nodeDelegator.waitForDeployment();
    
    // Setup: Initialize deposit pool and configure roles/assets
    await depositPool.initialize(await lrtConfig.getAddress());
    
    // Grant manager role to manager address
    const MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MANAGER"));
    await lrtConfig.grantRole(MANAGER_ROLE, manager.address);
    
    // Add test asset as supported
    await lrtConfig.addSupportedAsset(await testAsset.getAddress(), ethers.parseEther("1000000"));
    
    // Add node delegator to queue
    await depositPool.addNodeDelegatorContractToQueue([await nodeDelegator.getAddress()]);
    
    // Fund deposit pool with test tokens for the transfer
    await testAsset.transfer(await depositPool.getAddress(), ethers.parseEther("100"));
    
    // Deploy reentrant attacker contract
    const ReentrantAttackerFactory = await ethers.getContractFactory("ReentrantAttacker");
    const attackerContract = await ReentrantAttackerFactory.deploy(
      await depositPool.getAddress(),
      await testAsset.getAddress(),
      0 // ndcIndex
    );
    await attackerContract.waitForDeployment();
    
    // Fund attacker contract with test tokens for reentrancy
    await testAsset.transfer(await attackerContract.getAddress(), ethers.parseEther("50"));
    
    // Attempt reentrant attack - should revert with ReentrancyGuard reentrant call
    await expect(
      attackerContract.connect(attacker).attack(ethers.parseEther("10"), { gasLimit: 3000000 })
    ).to.be.reverted;
    
    // Verify no extra tokens were transferred
    const poolBalance = await testAsset.balanceOf(await depositPool.getAddress());
    expect(poolBalance).to.equal(ethers.parseEther("100"));
  });
});