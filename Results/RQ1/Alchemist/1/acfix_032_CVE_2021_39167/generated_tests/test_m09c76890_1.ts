import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant m09c76890 test", function () {
    it("should fail to deploy with empty executors array due to off-by-one error in mutant", async function () {
        const [owner] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("TimelockController");
        
        const minDelay = 3600; // 1 hour
        const proposers: string[] = [owner.address];
        const executors: string[] = []; // Empty executors array triggers the bug
        
        // The mutant has `i <= executors.length` instead of `i < executors.length`
        // With empty array, original loop (0 < 0) doesn't execute
        // But mutant loop (0 <= 0) executes once and tries to access executors[0] which doesn't exist
        await expect(
            Factory.deploy(minDelay, proposers, executors)
        ).to.be.reverted;
    });
});