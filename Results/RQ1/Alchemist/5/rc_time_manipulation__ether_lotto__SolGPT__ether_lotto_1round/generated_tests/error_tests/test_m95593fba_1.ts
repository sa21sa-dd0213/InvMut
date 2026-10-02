import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant m95593fba", function () {
  it("should kill mutant by sending exactly 10 wei and expecting success", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // In the original contract, sending 10 wei should succeed
    // In the mutant (msg.value + 1 == TICKET_AMOUNT), 10 + 1 = 11 != 10, so it reverts
    const tx = player.sendTransaction({
      to: await instance.getAddress(),
      value: 10,
    });

    await expect(tx).to.not.be.reverted;
  });
});