import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant detection - mcc648c58", function () {
    it("should detect mutant that adds 1 extra wei to deposit", async function () {
        const [owner] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("Reentrance");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        const depositAmount = ethers.parseEther("1.0");
        const tx = await instance.connect(owner).addToBalance({ value: depositAmount });
        await tx.wait();

        const balance = await instance.getBalance(owner.address);
        expect(balance).to.equal(depositAmount);
    });
});