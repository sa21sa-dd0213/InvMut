import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant m60b26066", function () {
  it("should kill mutant by verifying pot is reset after a win condition", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");

    // Play multiple times to ensure we hit a win condition (random == 0) in original
    for (let i = 0; i < 20; i++) {
      // Get current block timestamp to influence randomness
      const block = await ethers.provider.getBlock("latest");
      
      // Play the lottery
      await instance.connect(player).play({ value: TICKET_AMOUNT });

      // Check pot state after each play
      const potAfter = await instance.pot();
      
      // In the original contract, when random == 0, pot is reset to 0
      // In the mutant (using / instead of %), random will never be 0, so pot is never reset
      if (potAfter === BigInt(0)) {
        // Win condition occurred - pot was reset
        return; // Mutant is killed because original would pass, mutant would fail
      }
    }

    // If we never hit pot == 0 in 20 attempts, something is wrong
    // (extremely unlikely with 50% probability per play)
    expect.fail("Should have hit a win condition within 20 plays - mutant likely never resets pot");
  });
});