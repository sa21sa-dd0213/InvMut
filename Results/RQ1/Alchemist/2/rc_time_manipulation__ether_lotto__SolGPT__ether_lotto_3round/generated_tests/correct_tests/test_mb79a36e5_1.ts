import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant mb79a36e5", function () {
  it("should reject payment exceeding TICKET_AMOUNT (kill mutant with >= instead of ==)", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = 10n;
    const excessiveAmount = 15n; // greater than TICKET_AMOUNT

    // This should revert on original (requires exact equality) but pass on mutant (allows >=)
    await expect(
      player.sendTransaction({
        to: await instance.getAddress(),
        value: excessiveAmount
      })
    ).to.be.reverted;
  });
});