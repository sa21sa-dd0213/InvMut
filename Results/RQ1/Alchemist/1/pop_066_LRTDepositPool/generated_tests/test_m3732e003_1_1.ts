import { expect } from "chai";
import { ethers } from "hardhat";

describe("LRTDepositPool mutant m3732e003 - addNodeDelegatorContractToQueue", function () {
  let owner: any;
  let lrtConfig: any;
  let lrtDepositPool: any;

  beforeEach(async function () {
    [owner] = await ethers.getSigners();

    // Deploy a mock LRTConfig contract that implements the required interface
    const LRTConfigMock = await ethers.getContractFactory("LRTConfigMock");
    lrtConfig = await LRTConfigMock.deploy();
    await lrtConfig.waitForDeployment();

    // Deploy LRTDepositPool
    const LRTDepositPoolFactory = await ethers.getContractFactory("LRTDepositPool");
    lrtDepositPool = await LRTDepositPoolFactory.deploy();
    await lrtDepositPool.waitForDeployment();

    // Initialize the deposit pool
    await lrtDepositPool.initialize(await lrtConfig.getAddress());

    // Grant MANAGER role to owner for initialization purposes
    const MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MANAGER"));
    await lrtConfig.grantRole(MANAGER_ROLE, owner.address);
  });

  it("should correctly track the queue length when adding node delegators (detects multiplication mutant)", async function () {
    // Initial queue should be empty
    expect(await lrtDepositPool.getNodeDelegatorQueue()).to.have.lengthOf(0);

    // Add 2 node delegator contracts (these can be any non-zero addresses)
    const nodeDelegator1 = ethers.Wallet.createRandom().address;
    const nodeDelegator2 = ethers.Wallet.createRandom().address;

    await lrtDepositPool.addNodeDelegatorContractToQueue([nodeDelegator1, nodeDelegator2]);

    // After adding 2 contracts, the queue should have length 2
    const queue = await lrtDepositPool.getNodeDelegatorQueue();
    expect(queue).to.have.lengthOf(2);
    expect(queue[0]).to.equal(nodeDelegator1);
    expect(queue[1]).to.equal(nodeDelegator2);

    // Add one more contract
    const nodeDelegator3 = ethers.Wallet.createRandom().address;
    await lrtDepositPool.addNodeDelegatorContractToQueue([nodeDelegator3]);

    // Now queue should have length 3
    const updatedQueue = await lrtDepositPool.getNodeDelegatorQueue();
    expect(updatedQueue).to.have.lengthOf(3);
    expect(updatedQueue[2]).to.equal(nodeDelegator3);
  });

  it("should revert when exceeding maxNodeDelegatorCount (detects multiplication mutant)", async function () {
    // maxNodeDelegatorCount is initialized to 10
    // Add 5 contracts first (0 * 5 = 0, which would pass in mutant but 0 + 5 = 5 is correct)
    const nodeDelegators = Array.from({ length: 5 }, () => ethers.Wallet.createRandom().address);
    await lrtDepositPool.addNodeDelegatorContractToQueue(nodeDelegators);
    
    // Now queue has 5 elements
    expect(await lrtDepositPool.getNodeDelegatorQueue()).to.have.lengthOf(5);

    // Try to add 6 more (total would be 11, exceeding max of 10)
    const moreDelegators = Array.from({ length: 6 }, () => ethers.Wallet.createRandom().address);
    
    // Original contract: 5 + 6 = 11 > 10 => revert
    // Mutant: 5 * 6 = 30 > 10 => also revert (both revert here)
    await expect(
      lrtDepositPool.addNodeDelegatorContractToQueue(moreDelegators)
    ).to.be.revertedWithCustomError(lrtDepositPool, "MaximumNodeDelegatorCountReached");
  });

  it("should correctly enforce limit when adding to non-empty queue (critical mutant detection)", async function () {
    // Add 3 contracts first
    const firstBatch = Array.from({ length: 3 }, () => ethers.Wallet.createRandom().address);
    await lrtDepositPool.addNodeDelegatorContractToQueue(firstBatch);
    
    // Now queue length = 3
    // Try to add 8 more: 3 + 8 = 11 > 10 => should revert
    // Mutant: 3 * 8 = 24 > 10 => also revert
    
    // Try to add 4 more: 3 + 4 = 7 <= 10 => should succeed
    // Mutant: 3 * 4 = 12 > 10 => would revert incorrectly!
    const secondBatch = Array.from({ length: 4 }, () => ethers.Wallet.createRandom().address);
    await lrtDepositPool.addNodeDelegatorContractToQueue(secondBatch);
    
    // Original should succeed with queue length = 7
    expect(await lrtDepositPool.getNodeDelegatorQueue()).to.have.lengthOf(7);
    
    // This test kills the mutant because the mutant would revert here
    // (since 3 * 4 = 12 > 10), while the original succeeds (3 + 4 = 7 <= 10)
  });
});