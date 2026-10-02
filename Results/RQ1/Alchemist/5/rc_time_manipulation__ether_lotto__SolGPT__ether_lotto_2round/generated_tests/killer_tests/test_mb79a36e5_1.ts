import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant mb79a36e5", function () {
  it("should reject payment greater than TICKET_AMOUNT (kill mutant)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Try sending 15 wei (greater than TICKET_AMOUNT which is 10)
    // Original requires exactly 10, mutant accepts >= 10
    await expect(
      instance.connect(addr1).play({ value: 15 })
    ).to.be.reverted;
  });
});