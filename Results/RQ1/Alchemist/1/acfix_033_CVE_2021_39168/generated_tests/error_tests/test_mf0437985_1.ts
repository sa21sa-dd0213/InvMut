import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController - kill mutant mf0437985", function () {
    it("should succeed when targets and values arrays have matching lengths (kills mutant that uses != instead of ==)", async function () {
        const [owner, proposer, executor] = await ethers.getSigners();
        
        // Deploy with proposer and executor roles
        const Factory = await ethers.getContractFactory("TimelockController");
        const instance = await Factory.deploy(
            3600, // minDelay: 1 hour
            [proposer.address], // proposers
            [executor.address]  // executors
        );
        await instance.waitForDeployment();

        // Grant EXECUTOR_ROLE to executor
        const EXECUTOR_ROLE = await instance.EXECUTOR_ROLE();
        const TIMELOCK_ADMIN_ROLE = await instance.TIMELOCK_ADMIN_ROLE();
        await instance.connect(owner).grantRole(EXECUTOR_ROLE, executor.address);

        // Schedule a batch operation as proposer
        const targets = [owner.address];
        const values = [0];
        const datas = ["0x"];
        const predecessor = ethers.ZeroHash;
        const salt = ethers.ZeroHash;
        const delay = 3600;

        await instance.connect(proposer).scheduleBatch(
            targets,
            values,
            datas,
            predecessor,
            salt,
            delay
        );

        // Fast forward time past the delay
        await ethers.provider.send("evm_increaseTime", [3601]);
        await ethers.provider.send("evm_mine");

        // Execute batch with matching lengths - this should succeed in original but fail in mutant
        await expect(
            instance.connect(executor).executeBatch(
                targets,
                values,
                datas,
                predecessor,
                salt,
                { value: 0 }
            )
        ).to.not.be.reverted;
    });
});