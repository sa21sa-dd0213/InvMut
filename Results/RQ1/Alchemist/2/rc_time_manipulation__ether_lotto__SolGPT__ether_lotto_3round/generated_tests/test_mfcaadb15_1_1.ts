import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when sending incorrect amount (not TICKET_AMOUNT) - kills mutant mfcaadb15", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Try to call play() with 5 wei (not the required 10 wei)
    // Original contract reverts, mutant does not
    await expect(
      instance.connect(addr1).play({ value: 5 })
    ).to.be.reverted;
  });
});