import { expect } from "chai";
import { ethers } from "hardhat";

describe("LRTDepositPool - mutant mc6ae5c03", function () {
    it("should emit NodeDelegatorAddedinQueue event when adding node delegator contracts", async function () {
        const [owner, addr1, addr2] = await ethers.getSigners();
        
        // Deploy LRTConfig mock first
        const LRTConfigFactory = await ethers.getContractFactory("LRTConfig");
        const lrtConfig = await LRTConfigFactory.deploy();
        await lrtConfig.waitForDeployment();
        
        // Deploy LRTDepositPool
        const Factory = await ethers.getContractFactory("LRTDepositPool");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();
        
        // Initialize the contract
        await instance.initialize(await lrtConfig.getAddress());
        
        // Add node delegator contracts
        const nodeDelegators = [addr1.address, addr2.address];
        
        // Expect the event to be emitted for each node delegator
        await expect(instance.addNodeDelegatorContractToQueue(nodeDelegators))
            .to.emit(instance, "NodeDelegatorAddedinQueue")
            .withArgs(addr1.address)
            .and.to.emit(instance, "NodeDelegatorAddedinQueue")
            .withArgs(addr2.address);
    });
});