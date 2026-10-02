import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
    it("should kill mutant mbac0c80e by calling transferOwnership from non-owner and verifying ownership changed", async function () {
        const [owner, addr1] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("Owned");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // Verify initial owner
        expect(await instance.owner()).to.equal(owner.address);

        // Non-owner calls transferOwnership - should succeed in mutant, fail in original
        await instance.connect(addr1).transferOwnership(addr1.address);

        // In the mutant, ownership is transferred to addr1
        expect(await instance.owner()).to.equal(addr1.address);
    });
});