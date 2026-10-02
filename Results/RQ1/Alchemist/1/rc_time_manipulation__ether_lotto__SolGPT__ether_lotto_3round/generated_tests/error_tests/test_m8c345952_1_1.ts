import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant m8c345952 test", function () {
  it("should revert when sending exactly TICKET_AMOUNT (10 wei) due to mutant using != instead of ==", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to play with exactly 10 wei (TICKET_AMOUNT)
    // Original contract accepts this, but mutant reverts because it requires msg.value != TICKET_AMOUNT
    await expect(
      instance.connect(addr1).play({ value: 10 })
    ).to.be.reverted;
  });
});