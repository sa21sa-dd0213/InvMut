import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant detection", function () {
    it("should detect mutant m9087a223 by calling Put with non-zero value", async function () {
        const [owner] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("PENNY_BY_PENNY");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // Initialize the contract to enable Put function
        await instance.Initialized();

        // Attempt to call Put with a non-zero value - should succeed on original, revert on mutant
        const tx = instance.Put(0, { value: ethers.parseEther("1") });
        await expect(tx).to.not.be.reverted;
    });
});