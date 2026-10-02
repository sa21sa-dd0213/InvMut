import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant mb79a36e5", function () {
  it("should revert when sending more than the required ticket amount", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const ticketAmount = 10n; // TICKET_AMOUNT = 10 wei
    const overPayment = ticketAmount + 5n; // 15 wei

    // This should revert on the original contract (strict equality check)
    // but would pass on the mutant (>= check)
    await expect(
      instance.connect(addr1).play({ value: overPayment })
    ).to.be.reverted;
  });
});