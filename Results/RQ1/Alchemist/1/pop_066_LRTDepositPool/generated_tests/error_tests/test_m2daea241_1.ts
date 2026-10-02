import { expect } from "chai";
import { ethers } from "hardhat";

describe("LRTDepositPool mutant test - transferAssetToNodeDelegator without onlyLRTManager", function () {
  it("should revert when non-manager calls transferAssetToNodeDelegator", async function () {
    const [owner, manager, unauthorized] = await ethers.getSigners();
    
    // Deploy LRTDepositPool (constructor takes no arguments)
    const DepositPoolFactory = await ethers.getContractFactory("LRTDepositPool");
    const depositPool = await DepositPoolFactory.deploy();
    await depositPool.waitForDeployment();
    
    // Deploy a mock LRTConfig contract
    const LRTConfigFactory = await ethers.getContractFactory("LRTConfig");
    const lrtConfig = await LRTConfigFactory.deploy();
    await lrtConfig.waitForDeployment();
    
    // Deploy a mock ERC20 token for testing
    const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
    const testToken = await ERC20Factory.deploy("Test", "TST", ethers.parseEther("1000000"));
    await testToken.waitForDeployment();
    
    // Initialize the deposit pool with the LRTConfig address
    await depositPool.initialize(await lrtConfig.getAddress());
    
    // Set up the LRTConfig to support the test asset
    await lrtConfig.addNewSupportedAsset(await testToken.getAddress(), ethers.parseEther("10000"));
    
    // Grant MANAGER role to the manager account
    const MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MANAGER"));
    await lrtConfig.grantRole(MANAGER_ROLE, manager.address);
    
    // Add a node delegator contract to the queue (needed for transfer)
    const NodeDelegatorFactory = await ethers.getContractFactory("NodeDelegatorMock");
    const nodeDelegator = await NodeDelegatorFactory.deploy();
    await nodeDelegator.waitForDeployment();
    await depositPool.addNodeDelegatorContractToQueue([await nodeDelegator.getAddress()]);
    
    // Fund the deposit pool with some test tokens
    await testToken.transfer(await depositPool.getAddress(), ethers.parseEther("100"));
    
    // Attempt to call transferAssetToNodeDelegator from unauthorized address
    await expect(
      depositPool.connect(unauthorized).transferAssetToNodeDelegator(
        0,
        await testToken.getAddress(),
        ethers.parseEther("10")
      )
    ).to.be.revertedWith("CallerNotLRTConfigManager");
  });
});