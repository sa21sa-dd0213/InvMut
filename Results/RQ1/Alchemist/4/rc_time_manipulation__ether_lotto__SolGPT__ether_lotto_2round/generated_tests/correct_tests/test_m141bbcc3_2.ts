import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant detection test", function () {
  it("should keep pot unchanged when play() is called with less than TICKET_AMOUNT", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Check initial pot is 0
    expect(await instance.pot()).to.equal(0);

    // Call play() with 1 wei (less than TICKET_AMOUNT = 10)
    // Original contract reverts (requires exact equality)
    // Mutant allows the transaction, changing pot to 1
    await expect(
      instance.connect(player).play({ value: 1 })
    ).to.be.reverted;

    // After revert, pot should still be 0
    expect(await instance.pot()).to.equal(0);
  });
});