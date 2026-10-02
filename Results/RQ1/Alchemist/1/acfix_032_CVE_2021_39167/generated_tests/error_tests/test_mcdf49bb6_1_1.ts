import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant kill test", function () {
    it("should kill mutant mcdf49bb6 by preventing re-execution of completed operation", async function () {
        const [owner, proposer, executor] = await ethers.getSigners();
        
        const minDelay = 100; // 100 seconds delay
        const proposers = [proposer.address];
        const executors = [executor.address];
        
        const Factory = await ethers.getContractFactory("TimelockController");
        const timelock = await Factory.deploy(minDelay, proposers, executors);
        await timelock.waitForDeployment();
        
        // Give executor role to timelock itself (needed for _afterCall)
        const EXECUTOR_ROLE = await timelock.EXECUTOR_ROLE();
        await timelock.connect(owner).grantRole(EXECUTOR_ROLE, await timelock.getAddress());
        
        // Prepare a simple operation
        const target = owner.address;
        const value = 0;
        const data = "0x";
        const predecessor = ethers.ZeroHash;
        const salt = ethers.randomBytes(32);
        const delay = minDelay;
        
        // Schedule the operation as proposer
        const scheduleTx = await timelock.connect(proposer).schedule(
            target,
            value,
            data,
            predecessor,
            salt,
            delay
        );
        await scheduleTx.wait();
        
        // Get the operation id
        const id = await timelock.hashOperation(target, value, data, predecessor, salt);
        
        // Fast forward time past the delay
        await ethers.provider.send("evm_increaseTime", [minDelay + 1]);
        await ethers.provider.send("evm_mine", []);
        
        // First execution should succeed
        const executeTx = await timelock.connect(executor).execute(
            target,
            value,
            data,
            predecessor,
            salt,
            { value: 0 }
        );
        await executeTx.wait();
        
        // Verify operation is done
        expect(await timelock.isOperationDone(id)).to.be.true;
        
        // Attempt to execute the same operation again - should revert
        // The mutant would incorrectly allow this, so the test passes on original but fails on mutant
        await expect(
            timelock.connect(executor).execute(
                target,
                value,
                data,
                predecessor,
                salt,
                { value: 0 }
            )
        ).to.be.reverted;
    });
});