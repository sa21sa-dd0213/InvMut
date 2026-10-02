import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems mutant detection - transferOwnership", function () {
    it("should detect mutant that sets owner to address(this) instead of newOwnerAddress", async function () {
        const [owner, newOwner] = await ethers.getSigners();
        
        const Factory = await ethers.getContractFactory("GameItems");
        const instance = await Factory.deploy(owner.address, owner.address);
        await instance.waitForDeployment();
        
        // Verify initial owner is the deployer
        // We can test this indirectly by checking that only owner can call admin functions
        // For example, call adjustAdminAccess as non-owner should revert
        await expect(
            instance.connect(newOwner).adjustAdminAccess(newOwner.address, true)
        ).to.be.reverted;
        
        // Transfer ownership to newOwner
        await instance.connect(owner).transferOwnership(newOwner.address);
        
        // After transfer, the original owner should no longer be able to call admin functions
        await expect(
            instance.connect(owner).adjustAdminAccess(owner.address, true)
        ).to.be.reverted;
        
        // The new owner should now be able to call admin functions
        // If the mutant sets owner to address(this) instead of newOwner, this will fail
        await expect(
            instance.connect(newOwner).adjustAdminAccess(newOwner.address, true)
        ).to.not.be.reverted;
        
        // Verify the admin access was actually set by the new owner
        const isAdmin = await instance.isAdmin(newOwner.address);
        expect(isAdmin).to.equal(true);
    });
});