import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant detection", function () {
  it("should reject payment less than TICKET_AMOUNT (kill mutant m141bbcc3)", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to play with 5 wei (less than required 10)
    const tx = instance.connect(player).play({ value: 5 });
    
    // Original contract reverts with exact equality check; mutant would accept <= 10
    await expect(tx).to.be.reverted;
  });
});