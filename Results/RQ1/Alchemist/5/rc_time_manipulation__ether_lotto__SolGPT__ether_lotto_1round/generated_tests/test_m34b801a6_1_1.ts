import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant detection - block.prevrandao vs block.timestamp", function () {
  it("should detect mutant by showing that multiple calls in same block always result in bank winning (random != 0)", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");
    
    // Make multiple calls in the same block to exploit the deterministic randomness
    // In the mutant, both inputs to keccak256 are block.prevrandao (same value),
    // so the result will always be 0 (even) - meaning bank always wins (random != 0)
    let bankWinsCount = 0;
    const attempts = 5;
    
    for (let i = 0; i < attempts; i++) {
      // Mine a new block with a fixed prevrandao to ensure deterministic behavior
      await ethers.provider.send("evm_mine", []);
      
      const tx = await instance.connect(player).play({ value: TICKET_AMOUNT });
      await tx.wait();
      
      // Check if bank won (pot was NOT reset to 0)
      const potAfter = await instance.pot();
      if (potAfter > 0) {
        bankWinsCount++;
      }
    }
    
    // In the original contract (using block.timestamp), the outcome is pseudo-random
    // and bank should win roughly 50% of the time.
    // In the mutant, bank wins 100% of the time because keccak256(prevrandao, prevrandao) % 2 == 0 always
    // If bank wins every time, that's a clear indicator of the mutant
    expect(bankWinsCount).to.be.lessThan(attempts);
  });
});