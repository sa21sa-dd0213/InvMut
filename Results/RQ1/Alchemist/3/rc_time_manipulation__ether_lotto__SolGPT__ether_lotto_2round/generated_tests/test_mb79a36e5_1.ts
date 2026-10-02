import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant mb79a36e5 - require(msg.value >= TICKET_AMOUNT)", function () {
  it("should revert when sending more than TICKET_AMOUNT (10 wei) in original, but mutant accepts overpayment - test should detect mutant", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = 10n;
    const overpayment = TICKET_AMOUNT + 5n; // 15 wei

    // In the original contract, sending more than TICKET_AMOUNT should revert
    // The mutant changes require(msg.value == TICKET_AMOUNT) to require(msg.value >= TICKET_AMOUNT)
    // so overpayment will succeed in the mutant, but fail in the original
    await expect(
      instance.connect(player).play({ value: overpayment })
    ).to.be.reverted;

    // Additionally, check that the pot wasn't updated (original behavior)
    const potBefore = await instance.pot();
    expect(potBefore).to.equal(0n);
  });
});