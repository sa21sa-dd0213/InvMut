import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant detection", function () {
  it("should kill mutant by sending exact ticket amount and expecting success", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send exactly 10 wei (TICKET_AMOUNT) to play function
    const tx = await instance.connect(player).play({ value: 10 });
    await tx.wait();

    // Verify the transaction succeeded by checking pot was reset to 0
    // (since random will be either 0 or 1, pot becomes 0 on win)
    // If the mutant was used, this call would have reverted
    const pot = await instance.pot();
    expect(pot).to.equal(0);
  });
});