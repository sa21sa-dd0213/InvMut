import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant m141bbcc3 test", function () {
  it("should revert when sending less than TICKET_AMOUNT (original behavior) and kill the mutant that accepts underpayment", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const ticketAmount = 10n; // TICKET_AMOUNT = 10 wei
    const underPayment = 5n; // Less than TICKET_AMOUNT

    // This should revert on original, but succeed on mutant (which uses <=)
    await expect(
      instance.connect(addr1).play({ value: underPayment })
    ).to.be.reverted;
  });
});