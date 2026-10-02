import { expect } from "chai";
import { ethers } from "hardhat";

describe("LRTDepositPool - kill mutant m0be0a8c8", function () {
    it("should revert when adding more node delegators than maxNodeDelegatorCount", async function () {
        const [owner, addr1, addr2] = await ethers.getSigners();
        
        // Deploy LRTConfig mock
        const LRTConfigFactory = await ethers.getContractFactory("LRTConfig");
        const lrtConfig = await LRTConfigFactory.deploy();
        await lrtConfig.waitForDeployment();
        
        // Deploy LRTDepositPool
        const Factory = await ethers.getContractFactory("LRTDepositPool");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();
        
        // Initialize the contract
        await instance.initialize(await lrtConfig.getAddress());
        
        // Get the maxNodeDelegatorCount (default is 10)
        const maxCount = await instance.maxNodeDelegatorCount();
        
        // Prepare array of addresses to add up to the max
        const addressesToAdd = [];
        for (let i = 0; i < maxCount; i++) {
            addressesToAdd.push(addr1.address);
        }
        
        // Add max number of node delegators
        await instance.addNodeDelegatorContractToQueue(addressesToAdd);
        
        // Now try to add one more - this should revert
        await expect(
            instance.addNodeDelegatorContractToQueue([addr2.address])
        ).to.be.revertedWith("MaximumNodeDelegatorCountReached");
    });
});