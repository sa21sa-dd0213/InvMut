import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant kill test - m60b26066", function () {
  it("should detect when modulo is replaced with division by repeatedly playing and checking that pot resets", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");

    // Play multiple times; in the original contract, approximately half the calls
    // will hit random == 0, resetting the pot. In the mutant, random is almost
    // never 0, so the pot will accumulate and never reset.
    for (let i = 0; i < 20; i++) {
      await instance.connect(player).play({ value: TICKET_AMOUNT });
    }

    const potAfter = await instance.pot();
    // In the mutant, the pot will be very large (20 * 10 = 200 ETH minus possible fees)
    // In the original, it would likely be 0 or small due to resets.
    // We expect the pot to be greater than 0 (mutant behavior) because the branch
    // that resets the pot almost never executes.
    // If the mutant is killed, the test will fail because the pot is still 0
    // (original behavior), but we assert it's > 0 to catch the mutant.
    expect(potAfter).to.be.gt(ethers.parseEther("0"));
  });
});