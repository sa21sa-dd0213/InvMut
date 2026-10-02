import { expect } from "chai";
import { ethers } from "hardhat";

describe("LRTDepositPool mutant kill test - transferAssetToNodeDelegator", function () {
  it("should complete transferAssetToNodeDelegator without revert when transfer is valid", async function () {
    const [owner, manager, user] = await ethers.getSigners();
    
    // Deploy LRTDepositPool
    const Factory = await ethers.getContractFactory("LRTDepositPool");
    const lrtDepositPool = await Factory.deploy();
    await lrtDepositPool.waitForDeployment();
    
    // Deploy mock ERC20 token for testing
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    const mockToken = await ERC20Factory.deploy("Test", "TST", ethers.parseEther("1000000"));
    await mockToken.waitForDeployment();
    
    // Deploy mock NodeDelegator
    const NodeDelegatorFactory = await ethers.getContractFactory("MockNodeDelegator");
    const mockNodeDelegator = await NodeDelegatorFactory.deploy();
    await mockNodeDelegator.waitForDeployment();
    
    // Deploy mock LRTConfig
    const LRTConfigFactory = await ethers.getContractFactory("MockLRTConfig");
    const mockLRTConfig = await LRTConfigFactory.deploy();
    await mockLRTConfig.waitForDeployment();
    
    // Setup: initialize LRTDepositPool
    await lrtDepositPool.initialize(await mockLRTConfig.getAddress());
    
    // Setup: grant MANAGER role to manager
    await mockLRTConfig.grantRole(ethers.keccak256(ethers.toUtf8Bytes("MANAGER")), manager.address);
    
    // Setup: add token as supported asset
    await mockLRTConfig.addSupportedAsset(await mockToken.getAddress());
    
    // Setup: add node delegator to queue
    await lrtDepositPool.addNodeDelegatorContractToQueue([await mockNodeDelegator.getAddress()]);
    
    // Setup: transfer tokens to LRTDepositPool
    await mockToken.transfer(await lrtDepositPool.getAddress(), ethers.parseEther("100"));
    
    // Test: transferAssetToNodeDelegator should succeed (original behavior)
    // Mutant will revert with TokenTransferFailed even when transfer succeeds
    await expect(
      lrtDepositPool.connect(manager).transferAssetToNodeDelegator(
        0,
        await mockToken.getAddress(),
        ethers.parseEther("50")
      )
    ).to.not.be.reverted;
  });
});