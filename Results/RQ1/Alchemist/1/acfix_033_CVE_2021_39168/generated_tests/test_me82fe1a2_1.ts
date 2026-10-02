import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant me82fe1a2 - scheduleBatch loop condition", function () {
    it("should schedule multiple operations and verify they are pending, killing the mutant where loop condition is i > targets.length", async function () {
        const [owner, addr1, addr2] = await ethers.getSigners();
        
        // Deploy TimelockController with minimal delay and proposers/executors
        const minDelay = 3600; // 1 hour
        const proposers = [owner.address];
        const executors = [owner.address];
        
        const Factory = await ethers.getContractFactory("TimelockController");
        const timelock = await Factory.deploy(minDelay, proposers, executors);
        await timelock.waitForDeployment();
        
        // Prepare batch parameters with 2 targets
        const targets = [addr1.address, addr2.address];
        const values = [0, 0];
        const datas = ["0x", "0x"];
        const predecessor = ethers.ZeroHash;
        const salt = ethers.ZeroHash;
        
        // Schedule the batch
        const tx = await timelock.scheduleBatch(
            targets,
            values,
            datas,
            predecessor,
            salt,
            minDelay
        );
        await tx.wait();
        
        // Compute the operation ID
        const id = await timelock.hashOperationBatch(
            targets,
            values,
            datas,
            predecessor,
            salt
        );
        
        // Verify the operation is pending (should be true in original, false in mutant)
        const isPending = await timelock.isOperationPending(id);
        expect(isPending).to.equal(true, "Operation should be pending after scheduling");
        
        // Additional verification: operation should not be done
        const isDone = await timelock.isOperationDone(id);
        expect(isDone).to.equal(false, "Operation should not be done after scheduling");
    });
});