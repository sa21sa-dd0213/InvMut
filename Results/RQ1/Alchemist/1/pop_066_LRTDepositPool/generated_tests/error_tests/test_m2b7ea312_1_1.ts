import { expect } from "chai";
import { ethers } from "hardhat";

describe("LRTDepositPool mutant detection - m2b7ea312", function () {
  it("should emit UpdatedLRTConfig event during initialization", async function () {
    const [owner] = await ethers.getSigners();

    // Deploy LRTConfig mock or use actual LRTConfig contract
    // For this test, we need a valid LRTConfig address
    const LRTConfigFactory = await ethers.getContractFactory("LRTConfig");
    const lrtConfig = await LRTConfigFactory.deploy();
    await lrtConfig.waitForDeployment();

    // Deploy LRTDepositPool
    const LRTDepositPoolFactory = await ethers.getContractFactory("LRTDepositPool");
    const depositPool = await LRTDepositPoolFactory.deploy();
    await depositPool.waitForDeployment();

    // Verify that UpdatedLRTConfig event is emitted during initialize
    await expect(depositPool.initialize(await lrtConfig.getAddress()))
      .to.emit(depositPool, "UpdatedLRTConfig")
      .withArgs(await lrtConfig.getAddress());
  });
});