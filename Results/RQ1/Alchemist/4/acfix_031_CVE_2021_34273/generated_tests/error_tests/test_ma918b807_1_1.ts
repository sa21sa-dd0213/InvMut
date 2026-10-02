import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant test - kill ma918b807", function () {
    it("should revert when non-owner tries to call transferOwnership", async function () {
        const [owner, addr1] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("Owned");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // addr1 is not the owner, so transferOwnership should revert
        await expect(
            instance.connect(addr1).transferOwnership(addr1.address)
        ).to.be.reverted;
    });
});