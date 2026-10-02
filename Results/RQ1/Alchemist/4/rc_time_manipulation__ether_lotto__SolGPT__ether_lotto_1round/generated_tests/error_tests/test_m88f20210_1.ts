import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant kill test", function () {
  it("should detect pot mutation by verifying exact pot balance after play", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");

    // Player sends exactly 10 ether
    await instance.connect(player).play({ value: TICKET_AMOUNT });

    // After play, if random == 0, pot is reset to 0; if random == 1, pot remains
    // We need to check the scenario where random == 1 (pot not reset)
    // Since random is based on block.timestamp and block.difficulty, we can't control it
    // So we run multiple times until we get random == 1
    
    let potAfterPlay;
    let attempts = 0;
    const maxAttempts = 20;
    
    while (attempts < maxAttempts) {
      potAfterPlay = await instance.pot();
      
      // If pot is 0, random was 0 and pot was reset; try again
      if (potAfterPlay === 0n) {
        await instance.connect(player).play({ value: TICKET_AMOUNT });
        attempts++;
      } else {
        break;
      }
    }

    // If we got random == 1, pot should be exactly TICKET_AMOUNT (10 ether)
    // Original: pot += msg.value => pot = 10 ether
    // Mutant: pot += msg.value - 1 => pot = 9.999999999999999999 ether (1 wei less)
    if (potAfterPlay > 0n) {
      expect(potAfterPlay).to.equal(TICKET_AMOUNT);
    }
  });
});