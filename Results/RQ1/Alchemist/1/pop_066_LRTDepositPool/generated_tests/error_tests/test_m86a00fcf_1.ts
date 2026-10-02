import { expect } from "chai";
import { ethers } from "hardhat";

describe("LRTDepositPool - kill mutant m86a00fcf (division instead of subtraction)", function () {
  it("should revert when depositing beyond the deposit limit due to division operator mutation", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy LRTDepositPool (constructor has no arguments)
    const LRTDepositPoolFactory = await ethers.getContractFactory("LRTDepositPool");
    const depositPool = await LRTDepositPoolFactory.deploy();
    await depositPool.waitForDeployment();
    
    // Deploy mock LRTConfig
    const LRTConfigFactory = await ethers.getContractFactory("LRTConfig");
    const lrtConfig = await LRTConfigFactory.deploy();
    await lrtConfig.waitForDeployment();
    
    // Deploy mock ERC20 asset
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    const asset = await MockERC20Factory.deploy("Test Asset", "TST", 18);
    await asset.waitForDeployment();
    
    // Initialize deposit pool with LRTConfig
    await depositPool.initialize(await lrtConfig.getAddress());
    
    // Set up asset as supported with deposit limit
    const depositLimit = ethers.parseEther("100");
    await lrtConfig.addNewSupportedAsset(await asset.getAddress(), depositLimit);
    
    // Mint tokens to addr1 and approve deposit pool
    await asset.mint(addr1.address, ethers.parseEther("200"));
    await asset.connect(addr1).approve(await depositPool.getAddress(), ethers.parseEther("200"));
    
    // First deposit: use up the entire deposit limit
    await depositPool.connect(addr1).depositAsset(await asset.getAddress(), depositLimit);
    
    // Now try to deposit 1 wei more - this should revert due to MaximumDepositLimitReached
    // Original uses subtraction: 100 - 100 = 0, so deposit of 1 wei > 0 reverts
    // Mutant uses division: 100 / 100 = 1, so deposit of 1 wei <= 1 passes incorrectly
    await expect(
      depositPool.connect(addr1).depositAsset(await asset.getAddress(), 1)
    ).to.be.revertedWithCustomError(depositPool, "MaximumDepositLimitReached");
  });
});