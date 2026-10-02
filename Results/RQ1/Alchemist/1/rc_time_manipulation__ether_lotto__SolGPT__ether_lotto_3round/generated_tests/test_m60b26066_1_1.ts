import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant detection - m60b26066", function () {
  it("should detect that mutant replaces % with / by verifying pot is never cleared", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");

    // Play multiple times - in the original, sometimes pot gets cleared
    // In the mutant (division instead of modulo), random will never be 0,
    // so pot will never be reset and player never gets paid
    for (let i = 0; i < 10; i++) {
      const potBefore = await instance.pot();

      await expect(
        player.sendTransaction({
          to: await instance.getAddress(),
          value: TICKET_AMOUNT
        })
      ).to.not.be.reverted;

      const potAfter = await instance.pot();

      // In the mutant, pot should only increase (never reset to 0)
      // If pot ever goes down or becomes 0, the mutant is killed
      // because that would mean the original % logic was working
      expect(potAfter).to.be.gte(potBefore);
    }

    // After many plays, verify the pot is large (mutant never pays out)
    const finalPot = await instance.pot();
    expect(finalPot).to.be.gte(ethers.parseEther("90")); // At least 9 tickets worth accumulated
  });
});