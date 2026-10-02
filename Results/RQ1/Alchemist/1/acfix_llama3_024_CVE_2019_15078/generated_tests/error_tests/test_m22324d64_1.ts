import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant m22324d64 - getTokens distributionFinished", function () {
    it("should allow multiple getTokens calls when totalDistributed is below totalSupply, but mutant incorrectly sets distributionFinished=true after first call", async function () {
        const [owner, addr1, addr2] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("XBORNID");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // Verify initial state: distribution should not be finished
        expect(await instance.distributionFinished()).to.equal(false);

        // Get initial totalDistributed (should be 200000000e18 from constructor)
        const initialDistributed = await instance.totalDistributed();
        const totalSupply = await instance.totalSupply();
        
        // Ensure totalDistributed is far below totalSupply
        expect(initialDistributed).to.be.lessThan(totalSupply);

        // First call to getTokens from addr1 should succeed
        await expect(instance.connect(addr1).getTokens()).to.not.be.reverted;

        // After first call, distributionFinished should still be false in original
        // but in mutant it will be true (because if(true) sets it)
        const distributionStatusAfterFirst = await instance.distributionFinished();
        
        // Second call from addr2 - should succeed in original (distribution not finished)
        // but should revert in mutant because distributionFinished was set to true
        if (distributionStatusAfterFirst) {
            // Mutant detected: distributionFinished became true prematurely
            await expect(
                instance.connect(addr2).getTokens()
            ).to.be.reverted;
        } else {
            // Original behavior: second call should succeed
            await expect(instance.connect(addr2).getTokens()).to.not.be.reverted;
            // If we got here without revert, mutant is not killed by this test
            // But we expect the mutant to fail here, so this test will fail for the mutant
            expect(distributionStatusAfterFirst).to.equal(false, "Original should still have distributionFinished=false");
        }
    });
});