import { expect } from "chai";
import { ethers } from "hardhat";

describe("LRTDepositPool mutant kill test", function () {
  it("should kill mutant mefbd2fd7 by testing addNodeDelegatorContractToQueue with empty queue", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy LRTDepositPool (no constructor arguments)
    const Factory = await ethers.getContractFactory("LRTDepositPool");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a mock LRTConfig
    const LRTConfigFactory = await ethers.getContractFactory("LRTConfig");
    const lrtConfig = await LRTConfigFactory.deploy();
    await lrtConfig.waitForDeployment();

    // Initialize the deposit pool
    await instance.initialize(await lrtConfig.getAddress());

    // Grant DEFAULT_ADMIN_ROLE to owner
    const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;
    await lrtConfig.grantRole(DEFAULT_ADMIN_ROLE, owner.address);

    // Add first node delegator to empty queue
    // Original: 0 + 1 = 1, not > 10 (maxNodeDelegatorCount), so it should pass
    // Mutant: 0 - 1 = -1, -1 > 10 is false, so it incorrectly passes when it should fail
    // But wait - we need the test to pass on original and fail on mutant
    // Actually, the mutant changes + to -, so the check becomes:
    // nodeDelegatorQueue.length - length > maxNodeDelegatorCount
    // For empty queue (0) and length=1: 0 - 1 = -1, -1 > 10 is false, so it allows adding
    // For original: 0 + 1 = 1, 1 > 10 is false, so it also allows adding
    // We need a case where original allows but mutant reverts

    // Let's try adding many node delegators to fill up to maxNodeDelegatorCount
    // maxNodeDelegatorCount = 10 initially
    // Add 10 node delegators to fill the queue
    for (let i = 0; i < 10; i++) {
      const nodeDelegatorFactory = await ethers.getContractFactory("NodeDelegator");
      const nd = await nodeDelegatorFactory.deploy();
      await nd.waitForDeployment();
      await instance.addNodeDelegatorContractToQueue([await nd.getAddress()]);
    }

    // Now queue has 10 items, maxNodeDelegatorCount = 10
    // Original: 10 + 1 = 11, 11 > 10 is true -> revert with MaximumNodeDelegatorCountReached
    // Mutant: 10 - 1 = 9, 9 > 10 is false -> allows adding 11th delegator
    // So test should succeed on original (revert) and fail on mutant (no revert)

    const nodeDelegatorFactory = await ethers.getContractFactory("NodeDelegator");
    const extraND = await nodeDelegatorFactory.deploy();
    await extraND.waitForDeployment();

    await expect(
      instance.addNodeDelegatorContractToQueue([await extraND.getAddress()])
    ).to.be.revertedWithCustomError(instance, "MaximumNodeDelegatorCountReached");

    // This will pass on original (reverts as expected) and fail on mutant (doesn't revert)
  });
});