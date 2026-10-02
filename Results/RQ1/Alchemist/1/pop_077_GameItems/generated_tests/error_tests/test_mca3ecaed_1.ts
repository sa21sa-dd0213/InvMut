import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems reference (ethers v6; deploy may require constructor arguments)", function () {
    it("should kill mutant mca3ecaed - transferOwnership sets owner to address(0) instead of newOwner", async function () {
        const [owner, addr1, addr2] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("GameItems");
        const instance = await Factory.deploy(owner.address, addr1.address);
        await instance.waitForDeployment();

        // Call transferOwnership to transfer ownership to addr2
        await instance.transferOwnership(addr2.address);

        // Attempt to call an owner-only function as the new owner (addr2)
        // If the mutant is present, _ownerAddress will be address(0) instead of addr2,
        // so this call should fail
        await expect(
            instance.connect(addr2).adjustAdminAccess(addr2.address, true)
        ).to.be.reverted;
    });
});