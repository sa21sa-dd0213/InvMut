import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant test", function () {
  it("should revert when user with zero credit calls withdrawAll (mutant changes condition to true)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // addr1 has no deposits, so oCredit = 0
    // Original: condition oCredit > 0 fails, no withdrawal happens
    // Mutant: condition is always true, so it tries to transfer 0 ether and update state
    
    await expect(
      instance.connect(addr1).withdrawAll()
    ).to.be.reverted;
  });
});