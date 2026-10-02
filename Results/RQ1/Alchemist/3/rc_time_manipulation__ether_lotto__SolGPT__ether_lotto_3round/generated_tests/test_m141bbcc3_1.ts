import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant detection", function () {
  it("should reject payment less than TICKET_AMOUNT", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to send 9 wei (less than TICKET_AMOUNT of 10)
    await expect(
      instance.connect(addr1).play({ value: 9 })
    ).to.be.reverted;
  });
});