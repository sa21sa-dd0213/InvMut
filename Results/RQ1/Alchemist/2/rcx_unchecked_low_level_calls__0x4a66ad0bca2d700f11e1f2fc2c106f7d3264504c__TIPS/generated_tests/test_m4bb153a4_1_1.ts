import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant kill test", function () {
    it("should revert when array has one element due to <= causing out-of-bounds", async function () {
        const [owner] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("EBU");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        const from = "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9";
        const tos = ["0x1111111111111111111111111111111111111111"];
        const values = [1];

        // The owner is the 'from' address, so msg.sender check passes
        await expect(
            instance.connect(owner).transfer(tos, values)
        ).to.be.reverted;
    });
});