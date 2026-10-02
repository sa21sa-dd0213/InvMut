import { expect } from "chai";
import { ethers } from "hardhat";

describe("Mutant detection for onlyOwner modifier", function () {
    it("should revert when owner calls function protected by onlyOwner if modifier uses != instead of ==", async function () {
        const [owner, addr1] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("Owned");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // Call setOwner from the owner address - should succeed on original, revert on mutant
        await expect(
            instance.connect(owner).setOwner(addr1.address)
        ).to.be.revertedWith("Only admin can call address(this) function");
    });
});