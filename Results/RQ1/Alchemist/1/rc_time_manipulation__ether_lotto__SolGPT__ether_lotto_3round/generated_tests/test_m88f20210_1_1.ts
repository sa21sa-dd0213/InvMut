import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should detect mutant that subtracts 1 from msg.value when adding to pot", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = 10n;

    // Call play with exactly 10 wei
    const tx = await instance.connect(addr1).play({ value: TICKET_AMOUNT });
    await tx.wait();

    // Check the pot value - original would be 10, mutant would be 9
    const pot = await instance.pot();
    expect(pot).to.equal(TICKET_AMOUNT);
  });
});