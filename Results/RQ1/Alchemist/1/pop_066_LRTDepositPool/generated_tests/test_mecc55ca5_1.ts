import { expect } from "chai";
import { ethers } from "hardhat";

describe("LRTDepositPool mutant kill test - getNodeDelegatorQueue", function () {
  it("should kill the mutant by verifying getNodeDelegatorQueue returns correct data after adding node delegators", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy LRTDepositPool - note: constructor has no arguments, uses _disableInitializers()
    const DepositPoolFactory = await ethers.getContractFactory("LRTDepositPool");
    const depositPool = await DepositPoolFactory.deploy();
    await depositPool.waitForDeployment();

    // We need to deploy a mock LRTConfig first since initialize requires it
    // Deploy a minimal LRTConfig mock that supports the required interfaces
    const LRTConfigFactory = await ethers.getContractFactory("LRTConfig");
    const lrtConfig = await LRTConfigFactory.deploy();
    await lrtConfig.waitForDeployment();

    // Initialize the deposit pool with the LRT config address
    await depositPool.initialize(await lrtConfig.getAddress());

    // Get initial queue state - should be empty
    let queue = await depositPool.getNodeDelegatorQueue();
    expect(queue.length).to.equal(0);

    // Add a node delegator contract (using a simple contract address that exists)
    // For testing, we can use addr1's address as a placeholder node delegator
    const nodeDelegatorAddresses = [await addr1.getAddress(), await addr2.getAddress()];
    
    // First we need to grant the admin role to owner to call addNodeDelegatorContractToQueue
    const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;
    await lrtConfig.grantRole(DEFAULT_ADMIN_ROLE, owner.address);
    
    // Add node delegators to the queue
    await depositPool.addNodeDelegatorContractToQueue(nodeDelegatorAddresses);

    // Now call the mutated function and check the result
    // The mutant removes the return statement, so this should return empty or undefined
    queue = await depositPool.getNodeDelegatorQueue();
    
    // This assertion should fail on the mutant because the function returns nothing
    // On the original contract, it would return the array with 2 elements
    expect(queue.length).to.equal(2);
    expect(queue[0]).to.equal(await addr1.getAddress());
    expect(queue[1]).to.equal(await addr2.getAddress());
  });
});