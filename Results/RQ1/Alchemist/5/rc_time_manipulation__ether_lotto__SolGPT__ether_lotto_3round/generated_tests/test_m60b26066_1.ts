import { expect } from "chai";
import { ethers } } from "hardhat";

describe("EtherLotto mutant kill test - m60b26066", function () {
  it("should kill mutant by verifying pot payout occurs on modulo operation", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");
    
    // Play multiple times to increase probability of hitting random == 0
    for (let i = 0; i < 20; i++) {
      const potBefore = await instance.pot();
      const playerBalanceBefore = await ethers.provider.getBalance(player.address);
      
      const tx = await instance.connect(player).play({ value: TICKET_AMOUNT });
      const receipt = await tx.wait();
      
      const potAfter = await instance.pot();
      const playerBalanceAfter = await ethers.provider.getBalance(player.address);
      
      // If pot was reset to 0 (payout occurred), player should have received pot - fee
      if (potAfter === BigInt(0) && potBefore > BigInt(0)) {
        const expectedPayout = potBefore - FEE_AMOUNT;
        const actualGain = playerBalanceAfter - playerBalanceBefore + TICKET_AMOUNT;
        expect(actualGain).to.equal(expectedPayout);
        return; // Mutant killed: payout happened (impossible with / operator)
      }
    }
    
    // If we never saw a payout, mutant survives - fail the test
    expect.fail("No payout occurred after 20 plays - mutant likely present");
  });
});