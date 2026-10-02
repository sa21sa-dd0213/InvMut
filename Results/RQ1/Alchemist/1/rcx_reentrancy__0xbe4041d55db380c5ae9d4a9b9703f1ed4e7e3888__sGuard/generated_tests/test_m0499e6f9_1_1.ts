import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant kill test - m0499e6f9", function () {
    it("should revert when calling SetMinSum after Initialized, but mutant allows it", async function () {
        const [owner] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("MONEY_BOX");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // First call Initialized to lock the contract
        await instance.Initialized();

        // In the original contract, SetMinSum should revert because intitalized is true
        // In the mutant, the condition is if(false) so it will NOT revert and will update MinSum
        await expect(
            instance.SetMinSum(100)
        ).to.be.reverted;
    });
});