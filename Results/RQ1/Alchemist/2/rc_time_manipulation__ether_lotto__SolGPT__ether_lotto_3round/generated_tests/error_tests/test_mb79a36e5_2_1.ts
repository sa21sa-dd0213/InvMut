import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant mb79a36e5", function () {
    it("should revert when player sends more than TICKET_AMOUNT (original) vs succeed (mutant)", async function () {
        const [owner, player] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("EtherLotto");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        const TICKET_AMOUNT = 10n;
        const FEE_AMOUNT = 1n;
        const excessiveAmount = 15n; // greater than TICKET_AMOUNT

        const playerBalanceBefore = await ethers.provider.getBalance(player.address);
                
        // Send excessive amount - this should revert on original (requires exact 10)
        // but would succeed on mutant (allows >= 10)
        const tx = player.sendTransaction({
            to: await instance.getAddress(),
            value: excessiveAmount
        });

        await expect(tx).to.be.reverted;
                
        // Verify player balance didn't change (transaction was reverted)
        const playerBalanceAfter = await ethers.provider.getBalance(player.address);
        expect(playerBalanceAfter).to.equal(playerBalanceBefore);
    });
});