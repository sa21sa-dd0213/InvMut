import { expect } from "chai";
import { ethers } } from "hardhat";

describe("EtherLotto mutant kill test", function () {
  it("should revert when sending 10 wei (the original ticket amount) after mutant changes requirement to 11 wei", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Player sends exactly 10 wei (TICKET_AMOUNT) which should succeed in original
    // but should fail in mutant because mutant requires msg.value == 11
    await expect(
      player.sendTransaction({
        to: instance.target,
        value: 10n
      })
    ).to.be.reverted;
  });
});