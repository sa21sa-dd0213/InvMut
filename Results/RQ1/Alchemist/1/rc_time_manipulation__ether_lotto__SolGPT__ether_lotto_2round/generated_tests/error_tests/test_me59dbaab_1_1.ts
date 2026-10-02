import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant kill test", function () {
  it("should kill mutant that replaces subtraction with addition in transfer amount", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = 10n; // as defined in contract
    const FEE_AMOUNT = 1n;

    // Player sends exactly TICKET_AMOUNT
    const tx = player.sendTransaction({
      to: await instance.getAddress(),
      value: TICKET_AMOUNT
    });

    // In original: player receives pot - fee = 9 wei, contract balance becomes 0
    // In mutant: tries to send pot + fee = 11 wei but contract only has 10 wei -> revert
    await expect(tx).to.be.reverted;
  });
});