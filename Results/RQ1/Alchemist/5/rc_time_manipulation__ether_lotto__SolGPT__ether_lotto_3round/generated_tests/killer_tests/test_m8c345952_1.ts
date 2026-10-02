import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant m8c345952 test", function () {
  it("should kill mutant by sending exactly TICKET_AMOUNT and expecting success", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send exactly 10 wei (TICKET_AMOUNT) - original accepts, mutant reverts
    const tx = instance.connect(addr1).play({ value: ethers.parseEther("0") + 10n });
    
    // The original contract should succeed, but the mutant reverts with require(msg.value != TICKET_AMOUNT)
    // So we expect the transaction to succeed (not revert) - this will fail on the mutant
    await expect(tx).to.not.be.reverted;
  });
});