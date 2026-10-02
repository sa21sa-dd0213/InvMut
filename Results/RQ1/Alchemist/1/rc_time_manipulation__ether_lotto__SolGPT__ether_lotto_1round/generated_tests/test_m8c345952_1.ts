import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant m8c345952 test", function () {
  it("should succeed when sending exactly TICKET_AMOUNT (10 wei) - kills mutant that uses != instead of ==", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send exactly 10 wei (TICKET_AMOUNT) - original accepts, mutant reverts
    const tx = player.sendTransaction({
      to: await instance.getAddress(),
      value: 10n
    });

    // The mutant will revert because it requires msg.value != 10
    await expect(tx).to.not.be.reverted;
  });
});