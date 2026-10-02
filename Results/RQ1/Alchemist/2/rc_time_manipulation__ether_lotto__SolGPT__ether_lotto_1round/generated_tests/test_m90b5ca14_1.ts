import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should detect mutant m90b5ca14 by checking pot balance after a winning round", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Play one round with exactly 10 wei
    const TICKET_AMOUNT = 10n;
    const tx = await instance.connect(player).play({ value: TICKET_AMOUNT });
    await tx.wait();

    // After a round, if player won (random == 0), pot should be 0 in original
    // In mutant, pot becomes 1 wei because pot += msg.value+1 adds 11 instead of 10
    const potAfter = await instance.pot();
    
    // Original contract would set pot to 0 after paying out
    // Mutant leaves 1 wei in pot
    expect(potAfter).to.equal(0n);
  });
});