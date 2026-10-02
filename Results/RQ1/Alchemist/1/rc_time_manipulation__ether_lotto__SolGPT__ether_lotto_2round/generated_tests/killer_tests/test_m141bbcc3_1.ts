import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant m141bbcc3 - require(msg.value <= TICKET_AMOUNT)", function () {
  it("should revert when sending less than TICKET_AMOUNT (10 wei) to play()", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to play with only 9 wei (less than the required 10 wei)
    const tx = instance.connect(player).play({ value: 9 });

    // Original requires exact 10 wei, so 9 wei should revert
    await expect(tx).to.be.reverted;
  });
});