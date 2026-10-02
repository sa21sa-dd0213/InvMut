import { expect } from "chai";
import { ethers } from "hardhat";

describe("ANCHToken mutant kill test - transferFrom", function () {
    it("should kill mutant m23f94b44 by verifying transferFrom actually transfers tokens and deducts allowance", async function () {
        const [owner, addr1, addr2] = await ethers.getSigners();
                
        // Deploy ANCHToken with required constructor arguments
        // Router address - use a known test address (we'll use a dummy since we don't need actual Uniswap)
        const routerAddress = "0x0000000000000000000000000000000000000001";
        const usdTokenAddress = "0x0000000000000000000000000000000000000002";
                
        const Factory = await ethers.getContractFactory("ANCHToken");
        const instance = await Factory.deploy(routerAddress, usdTokenAddress);
        await instance.waitForDeployment();
                
        // Setup: Owner approves addr1 to spend tokens
        const approveAmount = ethers.parseEther("1000");
        await instance.approve(addr1.address, approveAmount);
                
        // Record balances and allowance before transfer
        const ownerBalanceBefore = await instance.balanceOf(owner.address);
        const addr2BalanceBefore = await instance.balanceOf(addr2.address);
        const allowanceBefore = await instance.allowance(owner.address, addr1.address);
                
        // Execute transferFrom from addr1 (spender) to transfer tokens from owner to addr2
        const transferAmount = ethers.parseEther("100");
        const tx = await instance.connect(addr1).transferFrom(owner.address, addr2.address, transferAmount);
        await tx.wait();
                
        // Verify balances changed (this would fail on mutant where no actual transfer occurs)
        const ownerBalanceAfter = await instance.balanceOf(owner.address);
        const addr2BalanceAfter = await instance.balanceOf(addr2.address);
        const allowanceAfter = await instance.allowance(owner.address, addr1.address);
                
        // Owner balance should decrease by transferAmount
        expect(ownerBalanceAfter).to.equal(ownerBalanceBefore - transferAmount);
                
        // Recipient balance should increase by transferAmount
        expect(addr2BalanceAfter).to.equal(addr2BalanceBefore + transferAmount);
                
        // Allowance should decrease by transferAmount
        expect(allowanceAfter).to.equal(allowanceBefore - transferAmount);
                
        // Additional check: emit Transfer event
        await expect(tx)
            .to.emit(instance, "Transfer")
            .withArgs(owner.address, addr2.address, transferAmount);
    });
});