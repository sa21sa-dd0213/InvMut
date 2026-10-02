import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant detection - m95593fba", function () {
  it("should revert when sending exactly TICKET_AMOUNT (10 wei) because mutant expects msg.value+1 == 10", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The original contract requires msg.value == 10
    // The mutant requires msg.value + 1 == 10, i.e. msg.value == 9
    // Sending exactly 10 wei should succeed on original but fail on mutant
    await expect(
      instance.connect(player).play({ value: 10 })
    ).to.be.reverted;
  });
});