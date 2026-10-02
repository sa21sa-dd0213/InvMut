import { expect } from "chai";
import { ethers } from "hardhat";

describe("LRTDepositPool - Mutant m0cb226a2 test", function () {
  it("should allow deposit exactly at the limit (original) but revert on mutant with >= condition", async function () {
    const [owner, depositor] = await ethers.getSigners();
    
    // Deploy LRTConfig mock (needed for constructor)
    const LRTConfigFactory = await ethers.getContractFactory("LRTConfig");
    const lrtConfig = await LRTConfigFactory.deploy();
    await lrtConfig.waitForDeployment();
    
    // Deploy LRTDepositPool
    const Factory = await ethers.getContractFactory("LRTDepositPool");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract
    await instance.initialize(await lrtConfig.getAddress());
    
    // Get the LRT_ORACLE constant hash
    const LRT_ORACLE = ethers.keccak256(ethers.toUtf8Bytes("LRT_ORACLE"));
    
    // Deploy mock oracle and rsETH token
    const MockOracleFactory = await ethers.getContractFactory("MockLRTOracle");
    const mockOracle = await MockOracleFactory.deploy();
    await mockOracle.waitForDeployment();
    
    const MockRSETHFactory = await ethers.getContractFactory("MockRSETH");
    const mockRSETH = await MockRSETHFactory.deploy();
    await mockRSETH.waitForDeployment();
    
    // Configure LRTConfig
    await lrtConfig.setContract(LRT_ORACLE, await mockOracle.getAddress());
    await lrtConfig.setRSETH(await mockRSETH.getAddress());
    
    // Deploy a mock asset token
    const MockAssetFactory = await ethers.getContractFactory("MockERC20");
    const mockAsset = await MockAssetFactory.deploy("Test Asset", "TST", 18);
    await mockAsset.waitForDeployment();
    
    // Add asset as supported with a deposit limit
    const depositLimit = ethers.parseEther("1000");
    await lrtConfig.addNewSupportedAsset(await mockAsset.getAddress(), depositLimit);
    
    // Give depositor some tokens and approve deposit pool
    await mockAsset.transfer(depositor.address, ethers.parseEther("1000"));
    await mockAsset.connect(depositor).approve(await instance.getAddress(), ethers.parseEther("1000"));
    
    // Get current limit (should be 1000 since no deposits yet)
    const currentLimit = await instance.getAssetCurrentLimit(await mockAsset.getAddress());
    
    // Deposit exactly at the limit
    await expect(
      instance.connect(depositor).depositAsset(
        await mockAsset.getAddress(),
        currentLimit
      )
    ).to.not.be.reverted;
    
    // Now try to deposit again (should revert with MaximumDepositLimitReached)
    // The mutant would revert even on the first deposit if using >= instead of >
    await expect(
      instance.connect(depositor).depositAsset(
        await mockAsset.getAddress(),
        ethers.parseEther("1")
      )
    ).to.be.revertedWith("MaximumDepositLimitReached");
  });
});