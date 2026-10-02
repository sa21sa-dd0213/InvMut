import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia reference (ethers v6; deploy may require constructor arguments)", function () {
    it("should detect mutant mbcebeeda: transferFrom uses multiplication instead of addition for recipient balance", async function () {
        const [owner, addr1, addr2] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("NewIntelTechMedia");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // Setup: give addr1 some tokens to transfer from
        await instance.connect(owner).transfer(addr1.address, ethers.parseEther("100"));
                
        // Setup: give addr2 some initial balance to detect multiplication vs addition
        await instance.connect(owner).transfer(addr2.address, ethers.parseEther("10"));
                
        // Get addr2's balance before the transferFrom
        const balanceBefore = await instance.balanceOf(addr2.address);
                
        // Owner approves addr1 to spend tokens
        await instance.connect(owner).approve(addr1.address, ethers.parseEther("50"));
                
        // addr1 transfers 5 tokens from owner to addr2
        await instance.connect(addr1).transferFrom(owner.address, addr2.address, ethers.parseEther("5"));
                
        // Get addr2's balance after the transferFrom
        const balanceAfter = await instance.balanceOf(addr2.address);
                
        // In the original: balanceAfter = balanceBefore + 5
        // In the mutant:   balanceAfter = balanceBefore * 5
        // If balanceBefore = 10, original gives 15, mutant gives 50
        expect(balanceAfter).to.equal(ethers.parseEther("15"));
    });
});