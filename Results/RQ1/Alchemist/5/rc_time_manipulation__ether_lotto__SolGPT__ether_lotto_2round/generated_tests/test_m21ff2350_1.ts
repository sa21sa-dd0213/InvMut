import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant m21ff2350 - kill test", function () {
  it("should allow a player to win and receive payout, but mutant prevents this", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");

    // Player plays once
    const tx1 = await instance.connect(player).play({ value: TICKET_AMOUNT });
    await tx1.wait();

    // Check pot after first play - if player won, pot should be 0
    let potAfterFirst = await instance.pot();
    
    // If mutant is live (condition always false), player never wins
    // So pot should still be 10 ether (or more if multiple plays)
    // In original, sometimes player wins and pot resets to 0
    
    // Play multiple times to increase probability of encountering win scenario
    for (let i = 0; i < 10; i++) {
      const tx = await instance.connect(player).play({ value: TICKET_AMOUNT });
      await tx.wait();
    }

    const potFinal = await instance.pot();
    
    // If mutant is active, pot will keep accumulating (never reset to 0)
    // In original, pot resets to 0 on each win, so it's unlikely to be > TICKET_AMOUNT after many plays
    // We expect the mutant to have pot significantly larger than TICKET_AMOUNT
    expect(potFinal).to.be.gt(TICKET_AMOUNT);
  });
});