import { expect } from "chai";
import { ethers } from "hardhat";

describe("ACCURAL_DEPOSIT mutant kill test - m00c237b8", function () {
    it("should revert SetLogFile after initialization (mutant fails to revert)", async function () {
        const [owner] = await ethers.getSigners();
                
        // Deploy ACCURAL_DEPOSIT (no constructor arguments needed)
        const Factory = await ethers.getContractFactory("ACCURAL_DEPOSIT");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();
                
        // First, initialize the contract
        await instance.Initialized();
                
        // Attempt to call SetLogFile after initialization - should revert in original
        // but in mutant the guard is broken (if(false)revert()) so it will succeed
        await expect(
            instance.SetLogFile("0x0000000000000000000000000000000000000001")
        ).to.be.reverted;
    });
});