import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant test - m8f0dd4b9", function () {
  it("should revert when user with zero credit calls withdrawAll", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // addr1 has never deposited, so credit[addr1] = 0
    // In the original contract, the condition oCredit > 0 would skip the withdrawal
    // In the mutant, oCredit >= 0 is always true, so it attempts to send 0 ether
    // This should revert because sending 0 value with a call that returns false fails the require
    await expect(
      instance.connect(addr1).withdrawAll()
    ).to.be.reverted;
  });
});