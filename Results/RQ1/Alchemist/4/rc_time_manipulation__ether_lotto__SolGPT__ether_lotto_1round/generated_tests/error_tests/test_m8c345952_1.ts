import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant detection", function () {
  it("should succeed when sending exactly TICKET_AMOUNT (10 wei) to play()", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = 10n; // 10 wei

    // Send exactly 10 wei - should succeed in original, revert in mutant
    await expect(
      player.sendTransaction({
        to: await instance.getAddress(),
        value: TICKET_AMOUNT,
      })
    ).to.not.be.reverted;
  });
});