import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController - kill mutant mf0437985", function () {
    it("should revert when targets.length != values.length in executeBatch (mutant incorrectly reverts when lengths match)", async function () {
        const [owner, proposer, executor] = await ethers.getSigners();
        
        const minDelay = 3600; // 1 hour
        const proposers = [proposer.address];
        const executors = [executor.address];
        
        const Factory = await ethers.getContractFactory("TimelockController");
        const timelock = await Factory.deploy(minDelay, proposers, executors);
        await timelock.waitForDeployment();
        
        // Grant executor role to the executor
        const EXECUTOR_ROLE = await timelock.EXECUTOR_ROLE();
        
        // Schedule an operation first to have something to execute
        const target = owner.address;
        const value = 0;
        const data = "0x";
        const predecessor = ethers.ZeroHash;
        const salt = ethers.keccak256(ethers.toUtf8Bytes("test"));
        const delay = minDelay;
        
        // Schedule the operation as proposer
        await timelock.connect(proposer).schedule(
            target,
            value,
            data,
            predecessor,
            salt,
            delay
        );
        
        // Fast forward time past the delay
        await ethers.provider.send("evm_increaseTime", [minDelay + 1]);
        await ethers.provider.send("evm_mine", []);
        
        // Prepare batch arrays with EQUAL lengths (this should succeed on original, fail on mutant)
        const targets = [target];
        const values = [value];
        const datas = [data];
        
        // Execute batch as executor - mutant will revert when lengths are equal
        await expect(
            timelock.connect(executor).executeBatch(
                targets,
                values,
                datas,
                predecessor,
                salt
            )
        ).to.not.be.reverted;
    });
});