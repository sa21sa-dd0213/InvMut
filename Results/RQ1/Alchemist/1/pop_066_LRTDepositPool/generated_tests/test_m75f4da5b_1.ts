import { expect } from "chai";
import { ethers } from "hardhat";

describe("LRTDepositPool - addNodeDelegatorContractToQueue mutant detection", function () {
  it("should allow adding node delegators exactly up to maxNodeDelegatorCount (original) but revert on mutant with >=)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy LRTDepositPool
    const LRTDepositPoolFactory = await ethers.getContractFactory("LRTDepositPool");
    const depositPool = await LRTDepositPoolFactory.deploy();
    await depositPool.waitForDeployment();

    // Deploy mock LRTConfig
    const LRTConfigFactory = await ethers.getContractFactory("LRTConfig");
    const lrtConfig = await LRTConfigFactory.deploy();
    await lrtConfig.waitForDeployment();

    // Initialize deposit pool
    await depositPool.initialize(await lrtConfig.getAddress());

    // Get the initial maxNodeDelegatorCount (default is 10)
    const maxCount = await depositPool.maxNodeDelegatorCount();
    
    // Add node delegators up to the max count (10 delegators)
    const delegators = [];
    for (let i = 0; i < maxCount; i++) {
      const delegatorFactory = await ethers.getContractFactory("NodeDelegator");
      const delegator = await delegatorFactory.deploy();
      await delegator.waitForDeployment();
      delegators.push(await delegator.getAddress());
    }

    // Add all 10 delegators - this should succeed on original (since 0 + 10 > 10 is false, so it passes)
    // But on mutant (0 + 10 >= 10 is true, so it would revert)
    await expect(depositPool.addNodeDelegatorContractToQueue(delegators))
      .to.not.be.reverted;
    
    // Verify the queue length equals maxCount
    const queueLength = await depositPool.getNodeDelegatorQueue();
    expect(queueLength.length).to.equal(maxCount);

    // Now try to add one more - should revert on both original and mutant
    const extraDelegatorFactory = await ethers.getContractFactory("NodeDelegator");
    const extraDelegator = await extraDelegatorFactory.deploy();
    await extraDelegator.waitForDeployment();

    await expect(
      depositPool.addNodeDelegatorContractToQueue([await extraDelegator.getAddress()])
    ).to.be.reverted;
  });
});