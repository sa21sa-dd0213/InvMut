import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant detection - deposit credit mismatch", function () {
    it("should detect mutant that adds +1 to credit on deposit", async function () {
        const [owner, addr1] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("ReentrancyDAO");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        const depositAmount = ethers.parseEther("1.0");
        const tx = await instance.connect(addr1).deposit({ value: depositAmount });
        await tx.wait();

        const credit = await instance.credit(addr1.address);
        // In original, credit should equal depositAmount exactly
        // In mutant, credit will be depositAmount + 1 wei
        expect(credit).to.equal(depositAmount);
    });
});