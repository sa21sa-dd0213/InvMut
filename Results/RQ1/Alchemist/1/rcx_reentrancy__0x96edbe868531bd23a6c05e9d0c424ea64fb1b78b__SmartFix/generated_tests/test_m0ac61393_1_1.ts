import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant m0ac61393 test", function () {
    it("should revert SetLogFile after Initialized is called", async function () {
        const [owner] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("PENNY_BY_PENNY");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // First initialize the contract
        await instance.Initialized();

        // Attempt to call SetLogFile after initialization - should revert in original, but mutant won't revert
        await expect(
            instance.SetLogFile(ethers.ZeroAddress)
        ).to.be.reverted;
    });
});