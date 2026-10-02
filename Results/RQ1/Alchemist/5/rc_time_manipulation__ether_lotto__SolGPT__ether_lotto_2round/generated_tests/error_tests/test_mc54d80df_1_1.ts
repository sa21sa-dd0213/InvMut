import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant kill test", function () {
  it("should revert when sending exactly 10 wei (the original TICKET_AMOUNT) because the mutant expects msg.value - 1 == 10, i.e., 11 wei", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The original requires msg.value == 10, but the mutant requires msg.value - 1 == 10 (i.e., msg.value == 11)
    // Sending exactly 10 wei should succeed in the original but revert in the mutant
    await expect(
      instance.connect(addr1).play({ value: 10 })
    ).to.be.reverted;
  });
});