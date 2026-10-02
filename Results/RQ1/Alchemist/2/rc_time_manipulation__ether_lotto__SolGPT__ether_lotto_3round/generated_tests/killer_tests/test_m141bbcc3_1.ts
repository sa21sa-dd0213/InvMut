import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant detection - m141bbcc5", function () {
  it("should revert when sending less than TICKET_AMOUNT", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send less than the required 10 wei (TICKET_AMOUNT = 10)
    const underpaymentAmount = 5; // 5 wei, strictly less than 10
    
    await expect(
      instance.connect(addr1).play({ value: underpaymentAmount })
    ).to.be.reverted;
  });
});