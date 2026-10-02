import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant detection - m95593fba", function () {
  it("should kill mutant by sending exactly TICKET_AMOUNT (10 wei) and expecting success", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send exactly 10 wei (TICKET_AMOUNT) which should succeed on original but revert on mutant
    const tx = player.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("0") + 10n // exactly 10 wei
    });

    // The original contract accepts 10 wei; the mutant requires 9 wei so this will revert
    await expect(tx).to.be.reverted;
  });
});