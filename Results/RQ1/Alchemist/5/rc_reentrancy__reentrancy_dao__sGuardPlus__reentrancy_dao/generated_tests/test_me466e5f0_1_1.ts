import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant test - me466e5f0", function () {
  it("should revert when user with zero credit calls withdrawAll (kills mutant that changed oCredit>0 to true)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // addr1 has no credit, calling withdrawAll should revert in original (credit check fails)
    // but mutant with 'if(true)' would proceed and cause underflow or unexpected behavior
    await expect(
      instance.connect(addr1).withdrawAll()
    ).to.be.reverted;
  });
});