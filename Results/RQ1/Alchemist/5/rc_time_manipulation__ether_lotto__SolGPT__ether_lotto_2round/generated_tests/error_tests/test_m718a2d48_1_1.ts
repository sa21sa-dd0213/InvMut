import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should detect mutant m718a2d48 by checking pot value after a single play", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = ethers.parseEther("10");
    const tx = await instance.connect(addr1).play({ value: TICKET_AMOUNT });
    await tx.wait();

    // In the original, pot should be exactly 10 ether after one play
    // In the mutant, pot will be 11 ether because of msg.value + 1
    const pot = await instance.pot();
    expect(pot).to.equal(TICKET_AMOUNT);
  });
});