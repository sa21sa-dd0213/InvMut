import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia mutant kill test - transfer balances[msg.sender] + instead of -", function () {
    it("should revert when sender's balance increases after transfer due to mutant addition", async function () {
        const [owner, addr1, addr2] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("NewIntelTechMedia");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // First, get tokens for addr1 via the getTokens function (requires ETH send)
        // We need to send value to trigger getTokens, value is initialized to 2500e18
        // But we can also just transfer tokens from owner who has totalDistributed initially
        const totalDistributed = ethers.parseEther("250000000");
        const transferAmount = ethers.parseEther("100");

        // Get initial balance of addr1
        const initialBalance = await instance.balanceOf(addr1.address);

        // Owner transfers tokens to addr1 first so addr1 has some balance
        await instance.connect(owner).transfer(addr1.address, transferAmount);

        // Now addr1 has transferAmount tokens, try to transfer to addr2
        const addr1BalanceBefore = await instance.balanceOf(addr1.address);
        const addr2BalanceBefore = await instance.balanceOf(addr2.address);

        // addr1 transfers some tokens to addr2
        const tx = await instance.connect(addr1).transfer(addr2.address, transferAmount);
        await tx.wait();

        const addr1BalanceAfter = await instance.balanceOf(addr1.address);
        const addr2BalanceAfter = await instance.balanceOf(addr2.address);

        // In the original contract: balances[msg.sender] decreases by transferAmount
        // In the mutant: balances[msg.sender] increases by transferAmount
        // If the mutant is present, addr1BalanceAfter will be addr1BalanceBefore + transferAmount
        // If original, addr1BalanceAfter will be addr1BalanceBefore - transferAmount
        // We assert the original behavior: sender balance should decrease
        expect(addr1BalanceAfter).to.equal(addr1BalanceBefore - transferAmount);
        
        // Additionally verify recipient received tokens
        expect(addr2BalanceAfter).to.equal(addr2BalanceBefore + transferAmount);
    });
});