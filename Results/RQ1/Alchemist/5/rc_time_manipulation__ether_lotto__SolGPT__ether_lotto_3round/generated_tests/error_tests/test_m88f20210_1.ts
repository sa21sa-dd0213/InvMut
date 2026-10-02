import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant m88f20210", function () {
  it("should kill mutant by checking pot balance after play", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");

    // Play once with exactly TICKET_AMOUNT
    const tx = await instance.connect(player).play({ value: TICKET_AMOUNT });
    await tx.wait();

    // Check pot balance - in original it should be 10 ether (TICKET_AMOUNT)
    // In mutant it will be 9 ether (TICKET_AMOUNT - 1) because of msg.value-1
    const potAfterPlay = await instance.pot();
    
    // If the mutant is present, pot will be TICKET_AMOUNT - 1 (9 ether) instead of TICKET_AMOUNT (10 ether)
    expect(potAfterPlay).to.equal(TICKET_AMOUNT);
  });
});