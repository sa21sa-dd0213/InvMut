import { expect } from "chai";
import { ethers } from "hardhat";

describe("LRTDepositPool mutant m32ff55f1 test", function () {
  it("should detect removal of return statement in getNodeDelegatorQueue", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy LRTDepositPool
    const LRTDepositPoolFactory = await ethers.getContractFactory("LRTDepositPool");
    const lrtDepositPool = await LRTDepositPoolFactory.deploy();
    await lrtDepositPool.waitForDeployment();
    
    // Deploy a mock LRTConfig
    const LRTConfigFactory = await ethers.getContractFactory("LRTConfig");
    const lrtConfig = await LRTConfigFactory.deploy();
    await lrtConfig.waitForDeployment();
    
    // Initialize the deposit pool with the LRTConfig address
    await lrtDepositPool.initialize(await lrtConfig.getAddress());
    
    // Add some node delegator contracts to the queue
    const mockNDC1 = await (await ethers.getContractFactory("MockNodeDelegator")).deploy();
    const mockNDC2 = await (await ethers.getContractFactory("MockNodeDelegator")).deploy();
    await mockNDC1.waitForDeployment();
    await mockNDC2.waitForDeployment();
    
    // Get the initial queue (should be empty)
    let queue = await lrtDepositPool.getNodeDelegatorQueue();
    expect(queue.length).to.equal(0);
    
    // Add node delegators
    await lrtDepositPool.addNodeDelegatorContractToQueue([await mockNDC1.getAddress(), await mockNDC2.getAddress()]);
    
    // Get the queue again
    queue = await lrtDepositPool.getNodeDelegatorQueue();
    
    // Verify the queue contains the expected addresses
    expect(queue.length).to.equal(2);
    expect(queue[0]).to.equal(await mockNDC1.getAddress());
    expect(queue[1]).to.equal(await mockNDC2.getAddress());
    
    // Add another node delegator
    const mockNDC3 = await (await ethers.getContractFactory("MockNodeDelegator")).deploy();
    await mockNDC3.waitForDeployment();
    await lrtDepositPool.addNodeDelegatorContractToQueue([await mockNDC3.getAddress()]);
    
    // Verify the queue length updated correctly
    queue = await lrtDepositPool.getNodeDelegatorQueue();
    expect(queue.length).to.equal(3);
    expect(queue[2]).to.equal(await mockNDC3.getAddress());
  });
});