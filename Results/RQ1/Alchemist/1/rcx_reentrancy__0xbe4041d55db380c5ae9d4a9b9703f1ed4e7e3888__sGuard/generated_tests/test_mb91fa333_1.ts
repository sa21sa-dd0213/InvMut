import { expect } from "chai";
import { ethers } } from "hardhat";

describe("MONEY_BOX mutant kill test", function () {
    it("should revert SetMinSum after initialization", async function () {
        const [owner] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("MONEY_BOX");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // Set initial MinSum value
        const initialMinSum = 100;
        await instance.SetMinSum(initialMinSum);

        // Initialize the contract (sets initialized = true)
        await instance.Initialized();

        // Attempt to change MinSum after initialization - should revert in original, pass in mutant
        const newMinSum = 200;
        await expect(
            instance.SetMinSum(newMinSum)
        ).to.be.reverted;

        // Verify MinSum stayed unchanged
        const currentMinSum = await instance.MinSum();
        expect(currentMinSum).to.equal(initialMinSum);
    });
});