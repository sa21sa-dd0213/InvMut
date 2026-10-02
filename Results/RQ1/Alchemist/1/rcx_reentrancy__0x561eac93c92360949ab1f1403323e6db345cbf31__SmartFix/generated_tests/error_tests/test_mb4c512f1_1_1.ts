import { expect } from "chai";
import { ethers } from "hardhat";

describe("BANK_SAFE mutant mb4c512f1 test", function () {
    it("should revert when calling SetLogFile after Initialized() in original, but mutant allows it", async function () {
        const [owner, addr1] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("BANK_SAFE");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // First initialize the contract
        await instance.connect(owner).Initialized();

        // Try to call SetLogFile after initialization - should revert in original
        // but mutant allows it since the guard is always false
        await expect(
            instance.connect(owner).SetLogFile(addr1.address)
        ).to.be.reverted;
    });
});