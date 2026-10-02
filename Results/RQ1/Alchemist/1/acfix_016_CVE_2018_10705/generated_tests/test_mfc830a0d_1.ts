import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant detection - mfc830a0d", function () {
    it("should kill the mutant by verifying setOwner sets the correct address", async function () {
        const [owner, addr1, addr2] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("Owned");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // Verify initial owner is deployer
        expect(await instance.owner()).to.equal(owner.address);

        // Call setOwner with addr1's address
        const tx = await instance.connect(owner).setOwner(addr1.address);
        await tx.wait();

        // Assert that owner is addr1, not address(0) - this will fail on the mutant
        expect(await instance.owner()).to.equal(addr1.address);
    });
});