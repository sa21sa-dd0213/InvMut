import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant mb79a36e5 detection", function () {
  it("should revert when sending more than the exact ticket amount", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = ethers.parseEther("10");
    const OVERPAYMENT = ethers.parseEther("15");

    // This should revert in the original contract (msg.value == TICKET_AMOUNT)
    // but would pass in the mutant (msg.value >= TICKET_AMOUNT)
    await expect(
      instance.connect(player).play({ value: OVERPAYMENT })
    ).to.be.reverted;
  });
});