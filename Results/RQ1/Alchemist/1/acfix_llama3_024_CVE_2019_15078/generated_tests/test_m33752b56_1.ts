import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID - transferOwnership mutant test", function () {
    it("should transfer ownership to a new address and not to the contract itself", async function () {
        const [owner, addr1] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("XBORNID");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // Verify initial owner is the deployer
        expect(await instance.owner()).to.equal(owner.address);

        // Transfer ownership to addr1
        await instance.connect(owner).transferOwnership(addr1.address);

        // Verify owner changed to addr1 (not the contract itself)
        expect(await instance.owner()).to.equal(addr1.address);
        expect(await instance.owner()).to.not.equal(await instance.getAddress());
    });
});