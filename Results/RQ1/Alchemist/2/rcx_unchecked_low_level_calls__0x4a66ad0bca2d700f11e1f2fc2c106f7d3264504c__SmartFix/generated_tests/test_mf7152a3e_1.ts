import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU reference (ethers v6; deploy may require constructor arguments)", function () {
    it("should revert when _tos array is empty (kills mutant mf7152a3e)", async function () {
        const [owner] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("EBU");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // Empty _tos array and empty v array
        const emptyTos: string[] = [];
        const emptyV: bigint[] = [];

        // The original contract should revert because _tos.length > 0 is required
        // The mutant would return true without reverting
        await expect(
            instance.transfer(emptyTos, emptyV)
        ).to.be.reverted;
    });
});