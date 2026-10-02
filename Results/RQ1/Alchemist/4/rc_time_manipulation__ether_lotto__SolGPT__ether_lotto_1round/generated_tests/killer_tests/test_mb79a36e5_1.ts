import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant mb79a36e5 test", function () {
  it("should revert when sending more than TICKET_AMOUNT", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const ticketAmount = 10n; // TICKET_AMOUNT = 10 wei
    const excessAmount = 15n; // 15 wei > 10 wei

    await expect(
      instance.connect(player).play({ value: excessAmount })
    ).to.be.reverted;
  });
});