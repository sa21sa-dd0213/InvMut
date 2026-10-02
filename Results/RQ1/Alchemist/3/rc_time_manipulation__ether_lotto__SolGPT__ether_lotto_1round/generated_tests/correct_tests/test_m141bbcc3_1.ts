import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant detection - m141bbcc3", function () {
  it("should reject payment less than TICKET_AMOUNT (10 wei) and kill the mutant that uses <=", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send less than TICKET_AMOUNT (e.g., 5 wei) - original requires exact 10 wei
    const smallPayment = 5; // 5 wei < 10 wei TICKET_AMOUNT
    await expect(
      instance.connect(addr1).play({ value: smallPayment })
    ).to.be.reverted;
  });
});