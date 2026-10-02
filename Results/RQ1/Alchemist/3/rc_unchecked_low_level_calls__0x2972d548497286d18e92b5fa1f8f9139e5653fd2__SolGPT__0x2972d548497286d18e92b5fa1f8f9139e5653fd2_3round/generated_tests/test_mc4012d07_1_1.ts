import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant mc4012d07 test", function () {
    it("should revert when _tos array is empty in original but succeed in mutant", async function () {
        const [owner, addr1, addr2] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("demo");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // Prepare empty arrays
        const emptyAddresses: string[] = [];
        const emptyValues: number[] = [];

        // The original requires _tos.length > 0, so empty array should revert
        // The mutant changes to >= 0 which is always true, so it will not revert
        await expect(
            instance.transfer(owner.address, addr1.address, emptyAddresses, emptyValues)
        ).to.be.reverted;
    });
});