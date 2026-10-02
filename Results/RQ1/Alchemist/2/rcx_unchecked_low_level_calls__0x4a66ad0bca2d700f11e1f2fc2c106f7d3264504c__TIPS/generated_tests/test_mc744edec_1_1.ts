import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant test - kill mc744edec (remove return true)", function () {
    it("should return true when calling transfer from authorized address with valid parameters", async function () {
        const [owner, addr1] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("EBU");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        const tos = [addr1.address];
        const values = [1]; // 1 token

        const tx = await instance.connect(owner).transfer(tos, values);
        const receipt = await tx.wait();

        // The function is declared to return bool, so we can check the return value
        // Using the tx result to check if it returned true
        const result = await instance.connect(owner).callStatic.transfer(tos, values);
        expect(result).to.equal(true);
    });
});