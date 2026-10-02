import { expect } from "chai";
import { ethers } from "hardhat";

describe("LRTDepositPool mutant m3eea45fc", function () {
  let owner: any;
  let lrtConfig: any;
  let instance: any;

  beforeEach(async function () {
    const [signer] = await ethers.getSigners();
    owner = signer;

    // Deploy a minimal LRTConfig mock for testing
    const LRTConfigFactory = await ethers.getContractFactory("LRTConfig");
    lrtConfig = await LRTConfigFactory.deploy();
    await lrtConfig.waitForDeployment();

    // Deploy LRTDepositPool
    const Factory = await ethers.getContractFactory("LRTDepositPool");
    instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the deposit pool
    await instance.initialize(await lrtConfig.getAddress());
  });

  it("should add node delegator contracts when queue has capacity", async function () {
    // Get current maxNodeDelegatorCount (should be 10 after init)
    const maxCount = await instance.maxNodeDelegatorCount();
    
    // Verify queue is empty initially
    const queueBefore = await instance.getNodeDelegatorQueue();
    expect(queueBefore.length).to.equal(0);

    // Add a single node delegator contract (valid address)
    const [deployer] = await ethers.getSigners();
    const nodeDelegatorAddress = deployer.address;
    
    // This should succeed on original, but fail on mutant because mutant always reverts
    await expect(
      instance.addNodeDelegatorContractToQueue([nodeDelegatorAddress])
    ).to.not.be.reverted;

    // Verify it was added
    const queueAfter = await instance.getNodeDelegatorQueue();
    expect(queueAfter.length).to.equal(1);
    expect(queueAfter[0]).to.equal(nodeDelegatorAddress);
  });
});