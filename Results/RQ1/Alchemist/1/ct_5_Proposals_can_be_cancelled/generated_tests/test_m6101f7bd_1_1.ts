import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO reference (ethers v6; deploy may require constructor arguments)", function () {
    it("should detect mutant m6101f7bd by testing isEqual with different strings", async function () {
        const [owner, addr1, addr2] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("DAO");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // Test case: Call isEqual with two different strings
        // Original function should return false when hashes don't match
        // Mutant removes the explicit return false, relying on implicit default
        const result = await instance.isEqual(
            ethers.toUtf8Bytes("GRANT"),
            ethers.toUtf8Bytes("ADDRESS")
        );

        // Assert that the function returns false for different strings
        expect(result).to.equal(false);
    });
});