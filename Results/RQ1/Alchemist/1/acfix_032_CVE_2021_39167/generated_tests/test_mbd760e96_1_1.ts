import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController - kill mutant mbd760e96 (isOperationPending)", function () {
    it("should return false for completed operations (timestamp == _DONE_TIMESTAMP)", async function () {
        const [owner, proposer, executor] = await ethers.getSigners();
        
        const minDelay = 3600; // 1 hour
        const proposers = [proposer.address];
        const executors = [executor.address];
        
        const Factory = await ethers.getContractFactory("TimelockController");
        const instance = await Factory.deploy(minDelay, proposers, executors);
        await instance.waitForDeployment();
        
        // Schedule an operation
        const target = owner.address;
        const value = 0;
        const data = "0x";
        const predecessor = ethers.ZeroHash;
        const salt = ethers.hexlify(ethers.randomBytes(32));
        const delay = minDelay;
        
        await instance.connect(proposer).schedule(target, value, data, predecessor, salt, delay);
        
        // Get the operation ID
        const id = await instance.hashOperation(target, value, data, predecessor, salt);
        
        // Fast-forward time past the delay
        await ethers.provider.send("evm_increaseTime", [delay + 1]);
        await ethers.provider.send("evm_mine", []);
        
        // Execute the operation
        await instance.connect(executor).execute(target, value, data, predecessor, salt, { value: 0 });
        
        // Now the operation is done (timestamp == _DONE_TIMESTAMP)
        // isOperationPending should return false for completed operations
        const isPending = await instance.isOperationPending(id);
        expect(isPending).to.equal(false);
    });
});