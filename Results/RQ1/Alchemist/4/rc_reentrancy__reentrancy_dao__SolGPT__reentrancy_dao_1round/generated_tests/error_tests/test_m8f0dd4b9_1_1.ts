import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant m8f0dd4b9 kill test", function () {
  it("should revert when user with zero credit calls withdrawAll (mutant allows zero credit withdrawal)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // addr1 has never deposited, so credit[addr1] = 0
    // Original contract would skip the if block (oCredit > 0 is false)
    // Mutant enters the if block (oCredit >= 0 is true) and attempts a zero-value call
    // This should revert because calling with 0 value and no data typically fails or causes underflow
    await expect(
      instance.connect(addr1).withdrawAll()
    ).to.be.reverted;
  });
});