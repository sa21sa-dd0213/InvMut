import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant detection - withdrawBalance revert removal", function () {
    it("should detect mutant that removes revert on failed withdrawal", async function () {
        const [owner, attacker] = await ethers.getSigners();
        
        // Deploy the Reentrance contract
        const Factory = await ethers.getContractFactory("Reentrance");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();
        
        // Deploy a malicious contract that always reverts when receiving ether
        const MaliciousFactory = await ethers.getContractFactory("MaliciousReceiver");
        const malicious = await MaliciousFactory.deploy();
        await malicious.waitForDeployment();
        
        // Fund the malicious contract with some ether via addToBalance
        const depositAmount = ethers.parseEther("1.0");
        const tx = await malicious.connect(owner).depositAndWithdraw(await instance.getAddress(), { value: depositAmount });
        await tx.wait();
        
        // Check balance before withdrawal
        const balanceBefore = await instance.getBalance(await malicious.getAddress());
        expect(balanceBefore).to.equal(depositAmount);
        
        // Attempt withdrawal - this should revert in original but might not in mutant
        try {
            const withdrawTx = await malicious.connect(owner).attack(await instance.getAddress());
            await withdrawTx.wait();
        } catch (error) {
            // If it reverts, that's expected for original but not for mutant
            // We still need to check balance wasn't zeroed
        }
        
        // Check if balance was incorrectly zeroed (mutant behavior)
        const balanceAfter = await instance.getBalance(await malicious.getAddress());
        
        // In original, balance should remain unchanged because revert prevented balance zeroing
        // In mutant, balance would be zero because revert was removed and balance gets zeroed
        expect(balanceAfter).to.equal(depositAmount);
    });
});