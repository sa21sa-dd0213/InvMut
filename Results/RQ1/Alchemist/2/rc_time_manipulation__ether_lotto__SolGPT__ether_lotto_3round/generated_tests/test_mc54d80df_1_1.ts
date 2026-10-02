import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant kill test", function () {
  it("should kill mutant mc54d80df by sending exactly TICKET_AMOUNT (10 wei) and expecting success", async function () {
    const [owner, player] = await ethers.getSigners();

    // Deploy the contract (no constructor arguments needed for EtherLotto)
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get initial pot (should be 0)
    const initialPot = await instance.pot();
    expect(initialPot).to.equal(0);

    // Player sends exactly 10 wei (TICKET_AMOUNT) to play()
    // In the original contract this succeeds; in the mutant it reverts
    await expect(
      instance.connect(player).play({ value: 10 })
    ).to.not.be.reverted;

    // Verify pot increased by exactly 10 wei
    const finalPot = await instance.pot();
    expect(finalPot).to.equal(10);
  });
});