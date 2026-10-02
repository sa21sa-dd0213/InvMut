import { expect } from "chai";
import { ethers } from "hardhat";

describe("LRTDepositPool mutant kill test - addNodeDelegatorContractToQueue (ma8c141a3)", function () {
  it("should revert when adding more node delegators than maxNodeDelegatorCount", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy LRTDepositPool
    const Factory = await ethers.getContractFactory("LRTDepositPool");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a mock LRTConfig that we can control
    const LRTConfigFactory = await ethers.getContractFactory("LRTConfig");
    const lrtConfig = await LRTConfigFactory.deploy();
    await lrtConfig.waitForDeployment();

    // Initialize the deposit pool with the LRT config
    await instance.initialize(await lrtConfig.getAddress());

    // Get the maxNodeDelegatorCount (should be 10 after initialization)
    const maxCount = await instance.maxNodeDelegatorCount();

    // Add node delegators up to the max count
    const nodeDelegatorsToAdd = [];
    for (let i = 0; i < maxCount; i++) {
      // Deploy mock node delegator contracts
      const MockNDFactory = await ethers.getContractFactory("MockNodeDelegator");
      const mockND = await MockNDFactory.deploy();
      await mockND.waitForDeployment();
      nodeDelegatorsToAdd.push(await mockND.getAddress());
    }

    // Add exactly maxCount node delegators (should succeed)
    await instance.addNodeDelegatorContractToQueue(nodeDelegatorsToAdd);

    // Verify queue length equals maxCount
    expect(await instance.getNodeDelegatorQueue()).to.have.lengthOf(maxCount);

    // Now try to add one more node delegator - this should revert
    const ExtraNDFactory = await ethers.getContractFactory("MockNodeDelegator");
    const extraND = await ExtraNDFactory.deploy();
    await extraND.waitForDeployment();

    // This transaction should revert because queue length (maxCount) + 1 > maxCount
    await expect(
      instance.addNodeDelegatorContractToQueue([await extraND.getAddress()])
    ).to.be.reverted;
  });
});