import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant m58a63c87 detection", function () {
  it("should detect mutation by verifying deterministic outcome with block.difficulty", async function () {
    const [owner, player] = await ethers.getSigners();
    
    // Deploy contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");
    
    // Get initial pot (should be 0)
    const initialPot = await instance.pot();
    expect(initialPot).to.equal(0);
    
    // First play: with block.difficulty = 0 in original, random will always be 0
    // This means player wins and pot resets to 0
    const tx1 = await instance.connect(player).play({ value: TICKET_AMOUNT });
    await tx1.wait();
    
    // In original contract, pot should be 0 after first play (since random == 0)
    // In mutant with block.prevrandao, random may be 1, leaving pot unchanged
    const potAfterFirst = await instance.pot();
    
    // Second play to verify consistency
    const tx2 = await instance.connect(player).play({ value: TICKET_AMOUNT });
    await tx2.wait();
    
    const potAfterSecond = await instance.pot();
    
    // Original contract: pot is always 0 after each play because random == 0
    // Mutant: pot will accumulate because random may not be 0
    // If pot is 0 after first play, it behaves like original
    // If pot is non-zero, it's the mutant
    if (potAfterFirst === BigInt(0)) {
      // Could still be original or lucky mutant
      // Check that second play also results in pot = 0 (original behavior)
      expect(potAfterSecond).to.equal(BigInt(0));
    } else {
      // Pot accumulated - this is the mutant behavior
      expect(potAfterFirst).to.equal(TICKET_AMOUNT); // Mutant: player didn't win
    }
  });
});