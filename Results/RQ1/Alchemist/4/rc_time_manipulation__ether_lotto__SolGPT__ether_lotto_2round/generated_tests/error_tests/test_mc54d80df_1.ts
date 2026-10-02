import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant kill test", function () {
  it("should kill mutant mc54d80df by sending exactly TICKET_AMOUNT (10 wei) and expecting success", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send exactly TICKET_AMOUNT = 10 wei
    const TICKET_AMOUNT = 10;
    const tx = await instance.connect(player).play({ value: TICKET_AMOUNT });
    
    // On the original contract, this should succeed
    // On the mutant (which requires msg.value - 1 == 10, i.e., msg.value == 11), it will revert
    await expect(tx).to.not.be.reverted;
  });
});