import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant m4ed0b322 - kill test", function () {
    it("should kill mutant by checking distributionFinished is true when totalDistributed equals totalSupply", async function () {
        const [owner, investor1, investor2] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("XBORNID");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // Initial state: totalDistributed = 200000000e18, totalSupply = 500000000e18
        // value = 1000e18, distributionFinished = false
                
        // We need to distribute tokens until totalDistributed reaches totalSupply
        // Calculate how many full 1000e18 distributions are needed
        // Starting totalDistributed = 200000000e18
        // Need to reach totalSupply = 500000000e18
        // So we need to distribute 300000000e18 more
                
        // First, let's send value to start distribution (value decreases each time)
        // We'll send many small amounts to slowly increase totalDistributed
                
        // Let's distribute in chunks using multiple investors to reach exactly totalSupply
        // We'll track totalDistributed manually
        let currentDistributed = ethers.parseEther("200000000");
        const totalSupply = ethers.parseEther("500000000");
        let currentValue = ethers.parseEther("1000");
                
        // Use multiple investors to distribute tokens
        const investors = [investor1, investor2];
        let investorIndex = 0;
                
        while (currentDistributed < totalSupply) {
            // Calculate remaining
            const remaining = totalSupply - currentDistributed;
                        
            // Get current value (will decrease over time)
            const currentVal = await instance.value();
                        
            if (currentVal > remaining) {
                // Need to send exactly remaining amount
                // We can call distr directly via getTokens with adjusted value
                // But getTokens uses value from contract, so we need to manipulate
                // Let's just send the remaining via the last distribution
                                
                // Actually, we need to reach exactly totalDistributed == totalSupply
                // Let's calculate how many more distributions we need
                // After each distribution, value decreases by factor of 99999/100000
                                
                // For simplicity, let's just distribute until we're close and then
                // manually adjust to hit exactly totalSupply
                break;
            }
                        
            // Send value to contract to trigger getTokens
            const investor = investors[investorIndex % investors.length];
            await owner.sendTransaction({
                to: await instance.getAddress(),
                value: currentVal
            });
                        
            // Update tracking
            currentDistributed = currentDistributed + currentVal;
            currentValue = (currentVal * BigInt(99999)) / BigInt(100000);
            investorIndex++;
        }
                
        // Now we need to make the final distribution to hit exactly totalSupply
        const finalRemaining = totalSupply - currentDistributed;
                
        // Get current contract value
        const finalValue = await instance.value();
                
        // We need to distribute exactly finalRemaining
        // Since getTokens uses contract's value, we need finalValue == finalRemaining
        // Let's just check if we can get there by sending exact amount
                
        // Send final amount to trigger last distribution
        if (finalRemaining > 0) {
            await owner.sendTransaction({
                to: await instance.getAddress(),
                value: finalRemaining
            });
        }
                
        // Now check distributionFinished - should be true in original, false in mutant
        const isFinished = await instance.distributionFinished();
                
        // The mutant will have distributionFinished = false when totalDistributed == totalSupply
        // The original will have distributionFinished = true
        // This test will pass on original (isFinished = true) and fail on mutant (isFinished = false)
        expect(isFinished).to.equal(true);
    });
});