import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant m1b46e310 test", function () {
  it("should detect division instead of subtraction in payout calculation", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const bankInitialBalance = await ethers.provider.getBalance(owner.address);
    const playerInitialBalance = await ethers.provider.getBalance(player.address);
    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");

    // Play the lottery - we need to ensure random == 0 (win condition)
    // Since we cannot control block.timestamp and block.difficulty in a single transaction,
    // we will play multiple times until we get a win
    let winOccurred = false;
    for (let i = 0; i < 20; i++) {
      const tx = await instance.connect(player).play({ value: TICKET_AMOUNT });
      const receipt = await tx.wait();

      // Check if pot was reset to 0 (meaning a win occurred)
      const potAfter = await instance.pot();
      if (potAfter === BigInt(0)) {
        winOccurred = true;
        
        const bankFinalBalance = await ethers.provider.getBalance(owner.address);
        const playerFinalBalance = await ethers.provider.getBalance(player.address);

        // In the original: player receives pot - FEE_AMOUNT = 10 - 1 = 9
        // In the mutant: player receives pot / FEE_AMOUNT = 10 / 1 = 10 (fee not subtracted)
        // Bank should receive exactly 1 wei fee in the original
        const expectedBankGain = FEE_AMOUNT;
        const expectedPlayerGain = TICKET_AMOUNT - FEE_AMOUNT;

        expect(bankFinalBalance - bankInitialBalance).to.equal(expectedBankGain);
        expect(playerFinalBalance - playerInitialBalance).to.equal(expectedPlayerGain);
        break;
      }
    }

    expect(winOccurred).to.be.true;
  });
});