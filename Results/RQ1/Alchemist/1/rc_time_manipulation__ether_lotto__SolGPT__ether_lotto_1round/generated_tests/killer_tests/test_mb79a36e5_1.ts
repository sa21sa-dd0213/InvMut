import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant mb79a36e5 test", function () {
  it("should revert when sending more than TICKET_AMOUNT (10 wei)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to play with 20 wei (more than the required 10)
    const tx = instance.connect(addr1).play({ value: 20 });
    
    // Original contract requires exact 10 wei, so 20 should revert
    // Mutant accepts >= 10, so it would NOT revert - this kills the mutant
    await expect(tx).to.be.reverted;
  });
});