import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant m8c345952 test", function () {
  it("should revert when sending exactly TICKET_AMOUNT (10 wei) because mutant requires msg.value != TICKET_AMOUNT", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The mutant changed require(msg.value == TICKET_AMOUNT) to require(msg.value != TICKET_AMOUNT)
    // Sending exactly 10 wei should now revert (mutant rejects the correct amount)
    await expect(
      instance.connect(player).play({ value: 10 })
    ).to.be.reverted;
  });
});