import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant kill test", function () {
  it("should kill mutant by sending exactly 10 wei (original TICKET_AMOUNT) and expecting success", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send exactly 10 wei (TICKET_AMOUNT) - should succeed in original but revert in mutant
    const tx = player.sendTransaction({
      to: await instance.getAddress(),
      value: 10n
    });

    // The mutant will revert because it requires msg.value == 11, so this should fail on mutant
    // Original would succeed, so we expect no revert
    await expect(tx).to.not.be.reverted;
  });
});