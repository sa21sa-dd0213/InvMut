import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant kill test - mb79a36e5", function () {
  it("should revert when msg.value is not exactly TICKET_AMOUNT (10 wei)", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send more than TICKET_AMOUNT (e.g., 15 wei) - should revert in original, pass in mutant
    await expect(
      player.sendTransaction({
        to: await instance.getAddress(),
        value: 15,
      })
    ).to.be.reverted;

    // Also verify exact amount works
    await expect(
      player.sendTransaction({
        to: await instance.getAddress(),
        value: 10,
      })
    ).to.not.be.reverted;
  });
});