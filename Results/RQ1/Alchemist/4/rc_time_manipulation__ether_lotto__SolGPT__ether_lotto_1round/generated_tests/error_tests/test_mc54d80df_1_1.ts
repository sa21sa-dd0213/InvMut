import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant detection", function () {
  it("should detect mutant that changes msg.value to msg.value-1 in require statement", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send exactly 10 wei (TICKET_AMOUNT) - should succeed on original but fail on mutant
    // because mutant requires msg.value - 1 == 10, i.e., msg.value == 11
    const tx = player.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("0") + 10n // exactly 10 wei
    });

    await expect(tx).to.be.reverted;
  });
});