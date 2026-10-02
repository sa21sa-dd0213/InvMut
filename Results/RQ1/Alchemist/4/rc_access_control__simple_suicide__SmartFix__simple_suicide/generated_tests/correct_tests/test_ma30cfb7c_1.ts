import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleSuicide mutant test - ma30cfb7c", function () {
    it("should revert when non-owner tries to call sudicideAnyone", async function () {
        const [owner, addr1] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("SimpleSuicide");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // Attempt to call sudicideAnyone from a non-owner address
        // In the original contract, this should revert because of the require statement
        // The mutant removes the require, so this test should fail on the mutant
        await expect(
            instance.connect(addr1).sudicideAnyone()
        ).to.be.reverted;
    });
});