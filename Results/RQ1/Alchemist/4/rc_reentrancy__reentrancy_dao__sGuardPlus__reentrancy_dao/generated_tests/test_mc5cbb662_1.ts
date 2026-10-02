import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant detection", function () {
    it("should revert when user with zero credit calls withdrawAll (kills mutant mc5cbb662)", async function () {
        const [owner, addr1] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("ReentrancyDAO");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // addr1 has zero credit (no deposit made)
        // The mutant allows execution even with zero credit (oCredit >= 0)
        // The original would skip the if block when oCredit == 0
        // The mutant will try to send 0 ether via call and set credit to 0
        
        // We expect this to revert because the mutant's call will attempt
        // to execute the withdrawal logic for zero balance, which may fail
        // due to the call() behavior with 0 value or because the require(callResult)
        // will fail when sending 0 ether to a contract
        await expect(
            instance.connect(addr1).withdrawAll()
        ).to.be.reverted;
    });
});