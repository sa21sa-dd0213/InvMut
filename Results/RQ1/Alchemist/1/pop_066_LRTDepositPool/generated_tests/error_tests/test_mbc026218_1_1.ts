import { expect } from "chai";
import { ethers } from "hardhat";

describe("LRTDepositPool - kill mutant mbc026218 (addNodeDelegatorContractToQueue loop condition)", function () {
    let lrtDepositPool: any;
    let lrtConfig: any;
    let owner: any;
    let addr1: any;
    let addr2: any;

    beforeEach(async function () {
        [owner, addr1, addr2] = await ethers.getSigners();

        // Deploy a mock LRTConfig (since LRTDepositPool depends on it)
        const LRTConfigFactory = await ethers.getContractFactory("LRTConfig");
        lrtConfig = await LRTConfigFactory.deploy();
        await lrtConfig.waitForDeployment();

        // Deploy LRTDepositPool (constructor takes no arguments, uses _disableInitializers)
        const LRTDepositPoolFactory = await ethers.getContractFactory("LRTDepositPool");
        lrtDepositPool = await LRTDepositPoolFactory.deploy();
        await lrtDepositPool.waitForDeployment();

        // Initialize the deposit pool with the LRTConfig address
        await lrtDepositPool.initialize(await lrtConfig.getAddress());

        // Grant DEFAULT_ADMIN_ROLE to owner for addNodeDelegatorContractToQueue (onlyLRTAdmin)
        const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";
        await lrtConfig.grantRole(DEFAULT_ADMIN_ROLE, owner.address);
    });

    it("should add node delegator contracts to the queue when called with a non-empty array", async function () {
        // Deploy a simple contract to act as a node delegator (just needs an address)
        const NodeDelegatorFactory = await ethers.getContractFactory("NodeDelegator");
        const nodeDelegator1 = await NodeDelegatorFactory.deploy();
        await nodeDelegator1.waitForDeployment();
        const nodeDelegator2 = await NodeDelegatorFactory.deploy();
        await nodeDelegator2.waitForDeployment();

        const delegators = [await nodeDelegator1.getAddress(), await nodeDelegator2.getAddress()];

        // Call addNodeDelegatorContractToQueue with the array
        await lrtDepositPool.addNodeDelegatorContractToQueue(delegators);

        // Verify that the queue length is 2 (mutant would keep it at 0)
        const queue = await lrtDepositPool.getNodeDelegatorQueue();
        expect(queue.length).to.equal(2);
        expect(queue[0]).to.equal(delegators[0]);
        expect(queue[1]).to.equal(delegators[1]);
    });
});