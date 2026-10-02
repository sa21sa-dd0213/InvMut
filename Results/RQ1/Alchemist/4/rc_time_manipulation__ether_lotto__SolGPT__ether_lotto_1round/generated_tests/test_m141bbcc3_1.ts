import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant m141bbcc3", function () {
  it("should reject payment less than TICKET_AMOUNT", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to play with only 5 wei (less than required 10 wei)
    const tx = instance.connect(player).play({ value: 5 });
    
    // Original contract reverts with msg.value == TICKET_AMOUNT
    // Mutant accepts msg.value <= TICKET_AMOUNT, so this will not revert
    await expect(tx).to.be.reverted;
  });
});