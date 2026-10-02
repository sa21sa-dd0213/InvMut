import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant detection", function () {
  it("should revert when sending less than TICKET_AMOUNT (kills mutant with <=)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send exactly 9 wei (less than TICKET_AMOUNT of 10)
    const tx = instance.connect(addr1).play({ value: 9 });
    
    // Original contract requires == 10, so it reverts; mutant with <= allows it
    await expect(tx).to.be.reverted;
  });
});