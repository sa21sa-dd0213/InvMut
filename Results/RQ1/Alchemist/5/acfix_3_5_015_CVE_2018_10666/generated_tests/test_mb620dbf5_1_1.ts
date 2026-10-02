import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant test - onlyAdmin modifier removed", function () {
    it("should revert when non-admin calls setOwner if onlyAdmin modifier is present", async function () {
        const [owner, addr1] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("Owned");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // Attempt to call setOwner from a non-admin address (addr1)
        // In the original contract this should revert; in the mutant it will succeed
        await expect(
            instance.connect(addr1).setOwner(addr1.address)
        ).to.be.revertedWith("Only admin can call address(this) function");
    });
});