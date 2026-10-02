import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia - kill mutant m14e44969", function () {
    it("should revert distribution after finishDistribution when calling getTokens", async function () {
        const [owner, addr1] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("NewIntelTechMedia");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // First, finish the distribution
        await (await instance.connect(owner).finishDistribution()).wait();

        // Attempt to call getTokens after distribution is finished - should revert
        await expect(
            instance.connect(addr1).getTokens()
        ).to.be.reverted;
    });
});