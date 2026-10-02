import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant kill test", function () {
  it("should kill mutant mc54d80df by sending exactly 10 wei (TICKET_AMOUNT) and expecting success", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send exactly 10 wei (TICKET_AMOUNT) - should succeed on original but fail on mutant
    const tx = player.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("0.000000000000000010") // 10 wei
    });

    // The mutant requires msg.value - 1 == 10, meaning msg.value must be 11
    // Sending 10 wei will cause revert in mutant, so this should throw
    await expect(tx).to.be.reverted;
  });
});