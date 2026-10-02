import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant kill test - m8c345952", function () {
  it("should revert when sending exactly TICKET_AMOUNT (10 wei) due to mutant using != instead of ==", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The mutant changes require(msg.value == TICKET_AMOUNT) to require(msg.value != TICKET_AMOUNT)
    // Sending exactly 10 wei (TICKET_AMOUNT) should succeed on original but revert on mutant
    await expect(
      player.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("0.000000000000000010") // exactly 10 wei
      })
    ).to.be.reverted;
  });
});