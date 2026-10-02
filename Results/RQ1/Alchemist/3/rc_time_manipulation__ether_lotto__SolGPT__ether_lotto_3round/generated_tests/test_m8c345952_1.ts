import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant detection", function () {
  it("should kill mutant m8c345952 by sending exactly TICKET_AMOUNT and expecting success", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = ethers.parseEther("10");
    
    // Send exactly TICKET_AMOUNT - should succeed on original but revert on mutant
    await expect(
      player.sendTransaction({
        to: await instance.getAddress(),
        value: TICKET_AMOUNT,
        data: instance.interface.encodeFunctionData("play")
      })
    ).to.not.be.reverted;
  });
});