import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia mutant mc0f31dd0 test", function () {
    it("should detect mutant that removes return statement from balanceOf", async function () {
        const [owner, addr1] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("NewIntelTechMedia");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // Transfer some tokens to addr1 via distr (getTokens)
        // First, ensure distribution is not finished
        const value = await instance.value();
        const totalRemaining = await instance.totalRemaining();
        
        // Only proceed if there are tokens to distribute
        if (value <= totalRemaining) {
            // Call getTokens from addr1 to distribute tokens
            await instance.connect(addr1).getTokens();
            
            // Get the expected balance (should be the value that was distributed)
            const expectedBalance = value;
            
            // Call balanceOf and check it returns the correct balance
            const actualBalance = await instance.balanceOf(addr1.address);
            
            // The original would return expectedBalance, mutant returns 0
            expect(actualBalance).to.equal(expectedBalance);
        } else {
            // If no tokens available, skip the test or handle edge case
            const balance = await instance.balanceOf(addr1.address);
            expect(balance).to.equal(0);
        }
    });
});