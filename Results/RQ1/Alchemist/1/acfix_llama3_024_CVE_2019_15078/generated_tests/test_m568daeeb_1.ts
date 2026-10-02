import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant detection - getTokens condition reversal", function () {
    it("should kill mutant m568daeeb by verifying value is capped when it exceeds totalRemaining", async function () {
        const [owner, investor] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("XBORNID");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // Initial state: totalRemaining = 300000000e18, value = 1000e18
        // value (1000e18) < totalRemaining (300000000e18), so condition should NOT trigger in original
        // In mutant, condition value < totalRemaining IS true, so value would be set to totalRemaining
        
        // Get initial balances and state
        const initialTotalRemaining = await instance.totalRemaining();
        const initialValue = await instance.value();
        const investorBalanceBefore = await instance.balanceOf(investor.address);
        
        // Investor calls getTokens() - this should distribute `value` (1000e18) tokens
        // in the original, but in the mutant it would distribute `totalRemaining` (300000000e18)
        await instance.connect(investor).getTokens();
        
        const investorBalanceAfter = await instance.balanceOf(investor.address);
        const tokensReceived = investorBalanceAfter - investorBalanceBefore;
        
        // In the original contract: tokensReceived should equal initialValue (1000e18)
        // In the mutant: tokensReceived would equal initialTotalRemaining (300000000e18)
        // The test asserts the original behavior, which will fail on the mutant
        expect(tokensReceived).to.equal(initialValue);
        
        // Also verify the investor is blacklisted (as per getTokens logic when toGive > 0)
        const isBlacklisted = await instance.blacklist(investor.address);
        expect(isBlacklisted).to.be.true;
    });
});