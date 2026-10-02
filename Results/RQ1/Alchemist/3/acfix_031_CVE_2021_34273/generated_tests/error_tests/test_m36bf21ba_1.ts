import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant m36bf21ba test", function () {
    it("should kill mutant by verifying transferOwnership correctly sets new owner", async function () {
        const [owner, addr1] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("Owned");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // Transfer ownership from owner to addr1
        await instance.connect(owner).transferOwnership(addr1.address);

        // Attempt to call a function restricted by onlyOwner from addr1
        // In the original, this should succeed; in the mutant it should revert
        await expect(
            instance.connect(addr1).owned()
        ).to.not.be.reverted;
    });
});