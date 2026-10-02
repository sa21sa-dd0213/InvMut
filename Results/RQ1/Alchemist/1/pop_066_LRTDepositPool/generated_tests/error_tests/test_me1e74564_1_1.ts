import { expect } from "chai";
import { ethers } from "hardhat";

describe("LRTDepositPool mutant test - addNodeDelegatorContractToQueue access control", function () {
    it("should revert when non-admin calls addNodeDelegatorContractToQueue", async function () {
        const [owner, addr1, addr2] = await ethers.getSigners();
        
        // Deploy LRTConfig first (needed for constructor args)
        const LRTConfigFactory = await ethers.getContractFactory("LRTConfig");
        const lrtConfig = await LRTConfigFactory.deploy();
        await lrtConfig.waitForDeployment();
        
        // Deploy LRTDepositPool
        const Factory = await ethers.getContractFactory("LRTDepositPool");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();
        
        // Initialize the contract
        await instance.initialize(await lrtConfig.getAddress());
        
        // Create a node delegator contract address (can be any address for this test)
        const nodeDelegatorAddress = addr1.address;
        
        // Attempt to call addNodeDelegatorContractToQueue from a non-admin address (addr2)
        await expect(
            instance.connect(addr2).addNodeDelegatorContractToQueue([nodeDelegatorAddress])
        ).to.be.reverted;
    });
});