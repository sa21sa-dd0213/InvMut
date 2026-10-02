import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant m141bbcc3 - require(msg.value <= TICKET_AMOUNT)", function () {
  it("should revert when sending exactly 9 wei (less than TICKET_AMOUNT of 10) on original, but mutant accepts it", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send exactly 9 wei (1 less than TICKET_AMOUNT = 10)
    // Original requires == 10, so this should revert
    // Mutant allows <= 10, so this would not revert (killing the mutant)
    const tx = instance.connect(player).play({ value: 9 });

    await expect(tx).to.be.reverted;
  });
});