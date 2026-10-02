import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant kill test", function () {
  it("should revert when user with zero credit calls withdrawAll (kills mutant with if(true))", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // addr1 has no credit (zero balance) and never deposited
    // Original: withdrawAll should skip (oCredit > 0 is false), no state change
    // Mutant: withdrawAll will attempt to send ether from contract balance (0) to addr1
    // This should cause a revert due to insufficient contract balance (or unexpected transfer)
    await expect(
      instance.connect(addr1).withdrawAll()
    ).to.be.reverted;
  });
});