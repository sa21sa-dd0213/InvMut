import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant mf8f64144 test", function () {
    it("should kill mutant by showing SetLogFile reverts even after initialization", async function () {
        const [owner] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("MONEY_BOX");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // First initialize the contract
        await instance.Initialized();

        // Now call SetLogFile with a valid address - in the original contract this should succeed
        // because SetLogFile only reverts if NOT initialized, but the mutant always reverts
        await expect(
            instance.SetLogFile(owner.address)
        ).to.not.be.reverted;
    });
});