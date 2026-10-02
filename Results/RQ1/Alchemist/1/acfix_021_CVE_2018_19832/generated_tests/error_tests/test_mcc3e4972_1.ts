import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia reference (ethers v6; deploy may require constructor arguments)", function () {
    it("should revert when non-owner calls finishDistribution on original contract, but not on mutant (mcc3e4972)", async function () {
        const [owner, addr1, addr2] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("NewIntelTechMedia");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // Attempt to call finishDistribution from a non-owner address
        await expect(
            instance.connect(addr1).finishDistribution()
        ).to.be.revertedWith("Ownable: caller is not the owner");
    });
});