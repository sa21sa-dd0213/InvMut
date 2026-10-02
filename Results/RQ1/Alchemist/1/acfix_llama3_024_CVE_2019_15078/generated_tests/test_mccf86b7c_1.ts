import { expect } from "chai";
import { ethers } } from "hardhat";

describe("XBORNID mutant mccf86b7c detection", function () {
    it("should detect mutant that changes >= to == in distribution finished check", async function () {
        const [owner, investor1, investor2] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("XBORNID");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // Get initial state
        const totalSupply = await instance.totalSupply();
        const totalDistributed = await instance.totalDistributed();
        const value = await instance.value();
        
        // Calculate how many tokens are needed to reach exactly totalSupply
        // We need to distribute until totalDistributed exceeds totalSupply
        const remainingToExceed = totalSupply - totalDistributed + BigInt(1);
        
        // Calculate how many calls to getTokens() are needed
        // Each call distributes 'value' tokens, but value decreases each time
        // Let's do it step by step
        
        // First, let's distribute some tokens normally
        await instance.connect(investor1).getTokens({ value: ethers.parseEther("1") });
        
        // Now check the state after first distribution
        let currentDistributed = await instance.totalDistributed();
        let currentValue = await instance.value();
        let currentRemaining = await instance.totalRemaining();
        
        // Keep distributing until we exceed totalSupply
        let iterations = 0;
        const maxIterations = 100;
        
        while (currentDistributed < totalSupply && iterations < maxIterations) {
            // Get a new investor for each call (since blacklist prevents reuse)
            const newInvestor = (await ethers.getSigners())[iterations + 3];
            
            // Send exactly the required ether to trigger getTokens()
            await instance.connect(newInvestor).getTokens({ value: ethers.parseEther("0.001") });
            
            currentDistributed = await instance.totalDistributed();
            currentValue = await instance.value();
            currentRemaining = await instance.totalRemaining();
            iterations++;
        }
        
        // Now we should have totalDistributed >= totalSupply in the original
        // In the mutant, totalDistributed == totalSupply might not trigger if it exceeds
        
        // Try one more distribution - this should revert in original but pass in mutant
        const lastInvestor = (await ethers.getSigners())[iterations + 3];
        
        // In the original code, distributionFinished should be true and getTokens should revert
        // In the mutant, if totalDistributed > totalSupply, distributionFinished might never be set
        const tx = instance.connect(lastInvestor).getTokens({ value: ethers.parseEther("0.001") });
        
        // If the mutant is present (== instead of >=), this might succeed
        // If original code, it should revert
        // We expect it to revert (original behavior)
        await expect(tx).to.be.reverted;
        
        // Additional verification: distributionFinished should be true
        const isFinished = await instance.distributionFinished();
        expect(isFinished).to.equal(true);
    });
});