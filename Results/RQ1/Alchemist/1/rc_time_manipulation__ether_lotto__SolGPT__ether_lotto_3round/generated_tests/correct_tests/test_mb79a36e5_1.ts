import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant mb79a36e5 detection", function () {
  it("should revert when sending more than TICKET_AMOUNT on original but accept on mutant", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send 15 wei which is greater than TICKET_AMOUNT (10)
    // On original contract this should revert due to msg.value == TICKET_AMOUNT check
    // On mutant this will pass because of msg.value >= TICKET_AMOUNT check
    await expect(
      instance.connect(player).play({ value: 15 })
    ).to.be.reverted;
  });
});