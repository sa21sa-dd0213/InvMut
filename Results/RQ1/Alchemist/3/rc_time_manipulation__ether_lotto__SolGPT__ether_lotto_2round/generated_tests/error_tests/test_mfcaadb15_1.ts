import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant kill test - mfcaadb15", function () {
  it("should revert when sending incorrect ticket amount (not equal to TICKET_AMOUNT)", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send 5 wei instead of the required 10 wei (TICKET_AMOUNT)
    await expect(
      instance.connect(player).play({ value: ethers.parseEther("0.000000000000000005") })
    ).to.be.reverted;

    // Also verify that sending 0 wei reverts
    await expect(
      instance.connect(player).play({ value: 0 })
    ).to.be.reverted;
  });
});