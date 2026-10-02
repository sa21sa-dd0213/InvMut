import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant kill test - m95593fba", function () {
  it("should revert when sending exactly 10 wei (original TICKET_AMOUNT) because mutant requires 9 wei", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send exactly 10 wei (original TICKET_AMOUNT)
    // The mutant requires msg.value + 1 == 10, meaning msg.value == 9
    // So sending 10 wei should revert on the mutant
    await expect(
      player.sendTransaction({
        to: await instance.getAddress(),
        value: 10n
      })
    ).to.be.reverted;
  });
});