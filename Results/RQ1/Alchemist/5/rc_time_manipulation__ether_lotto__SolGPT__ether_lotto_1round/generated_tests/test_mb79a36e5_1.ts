import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant test", function () {
  it("should revert when sending more than the exact ticket amount", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = 10n; // 10 wei
    const excessAmount = 15n; // 15 wei - more than required

    // This should revert in the original contract (exact equality check)
    // but would pass in the mutant (>= check), thus killing the mutant
    await expect(
      instance.connect(addr1).play({ value: excessAmount })
    ).to.be.reverted;
  });
});