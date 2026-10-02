import { expect } from "chai";
import { ethers } from "hardhat";

describe("BANK_SAFE mutant m87c75afd test", function () {
    it("should kill mutant by calling SetLogFile before initialization and expecting no revert", async function () {
        const [owner] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("BANK_SAFE");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // Before initialization, original allows SetLogFile; mutant always reverts
        await expect(
            instance.connect(owner).SetLogFile(owner.address)
        ).to.not.be.reverted;
    });
});