import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant test for SetLogFile", function () {
    it("should revert SetLogFile after Initialized is called, but mutant allows it", async function () {
        const [owner] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("MONEY_BOX");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // First initialize the contract
        const txInit = await instance.Initialized();
        await txInit.wait();

        // Now try to set the log file - should revert in original, but not in mutant
        const logFactory = await ethers.getContractFactory("Log");
        const logInstance = await logFactory.deploy();
        await logInstance.waitForDeployment();

        await expect(
            instance.SetLogFile(await logInstance.getAddress())
        ).to.be.reverted;
    });
});