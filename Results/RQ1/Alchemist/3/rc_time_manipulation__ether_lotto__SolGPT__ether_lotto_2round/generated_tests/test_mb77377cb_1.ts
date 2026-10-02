import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant mb77377cb", function () {
    it("should kill mutant by verifying payout only occurs when random == 0", async function () {
        const [owner, player1] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("EtherLotto");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();
        
        const TICKET_AMOUNT = ethers.parseEther("10");
        const FEE_AMOUNT = ethers.parseEther("1");
        
        // Play multiple times to get both outcomes (random == 0 and random != 0)
        let potBefore: bigint;
        let playerBalanceBefore: bigint;
        let ownerBalanceBefore: bigint;
        let potAfter: bigint;
        let playerBalanceAfter: bigint;
        let ownerBalanceAfter: bigint;
        
        // Keep playing until we get a round where random == 0 (payout should happen in original)
        for (let i = 0; i < 20; i++) {
            potBefore = await instance.pot();
            playerBalanceBefore = await ethers.provider.getBalance(player1.address);
            ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
            
            const tx = await instance.connect(player1).play({ value: TICKET_AMOUNT });
            const receipt = await tx.wait();
            
            potAfter = await instance.pot();
            playerBalanceAfter = await ethers.provider.getBalance(player1.address);
            ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
            
            // If pot reset to zero, this was a winning round (random == 0 in original)
            if (potAfter === BigInt(0)) {
                // In original: player gets pot - fee, owner gets fee
                // Expected player gain: potBefore + TICKET_AMOUNT - FEE_AMOUNT - TICKET_AMOUNT = potBefore - FEE_AMOUNT
                const expectedPlayerGain = potBefore - FEE_AMOUNT;
                const actualPlayerGain = playerBalanceAfter - playerBalanceBefore;
                const actualOwnerGain = ownerBalanceAfter - ownerBalanceBefore;
                
                // Verify payout happened correctly (original behavior)
                expect(actualPlayerGain).to.equal(expectedPlayerGain);
                expect(actualOwnerGain).to.equal(FEE_AMOUNT);
                return; // Test passes - mutant would fail here
            }
        }
        
        // If we never got random == 0, force the issue by replaying with same block conditions
        // This test will kill the mutant if it ever hits a winning round
        expect.fail("Could not trigger random == 0 scenario after 20 attempts");
    });
});