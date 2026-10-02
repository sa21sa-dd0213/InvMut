import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID reference (ethers v6; deploy may require constructor arguments)", function () {
    it("should kill mutant m12e0bb98 by testing that overwriting non-zero allowance with another non-zero value reverts", async function () {
        const [owner, addr1, addr2] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("XBORNID");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // First, approve addr1 to spend 100 tokens from owner
        const firstApproveAmount = ethers.parseEther("100");
        await instance.connect(owner).approve(addr1.address, firstApproveAmount);

        // Verify allowance was set
        let allowance = await instance.allowance(owner.address, addr1.address);
        expect(allowance).to.equal(firstApproveAmount);

        // Now attempt to approve a different non-zero amount for the same spender
        const secondApproveAmount = ethers.parseEther("200");
        
        // The original contract should revert this transaction (return false)
        // The mutant would incorrectly allow it
        const tx = await instance.connect(owner).approve(addr1.address, secondApproveAmount);
        const receipt = await tx.wait();
        
        // Check if the approval was actually changed (mutant behavior) or not (original behavior)
        allowance = await instance.allowance(owner.address, addr1.address);
        
        // The original contract would return false and keep the first allowance
        // The mutant would allow the change to the second allowance
        // We expect the original behavior: allowance should still be the first amount
        expect(allowance).to.equal(firstApproveAmount);
    });
});