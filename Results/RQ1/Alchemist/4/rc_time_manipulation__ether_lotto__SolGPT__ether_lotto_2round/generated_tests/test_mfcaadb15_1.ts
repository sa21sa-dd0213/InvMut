import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when play() is called with incorrect msg.value (not equal to TICKET_AMOUNT of 10 wei)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to call play() with 0 wei (should revert because TICKET_AMOUNT is 10)
    await expect(
      instance.connect(addr1).play({ value: 0 })
    ).to.be.reverted;

    // Attempt to call play() with 5 wei (also incorrect amount)
    await expect(
      instance.connect(addr1).play({ value: 5 })
    ).to.be.reverted;

    // Attempt to call play() with 20 wei (also incorrect amount)
    await expect(
      instance.connect(addr1).play({ value: 20 })
    ).to.be.reverted;
  });
});