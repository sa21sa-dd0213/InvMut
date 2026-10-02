import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant m7e788696", function () {
  it("should revert when user with zero credit calls withdrawAll on original, but mutant allows it", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // addr1 has never deposited, so their credit is 0
    // In the original contract, withdrawAll should revert because oCredit > 0 is false
    // In the mutant, the condition is always true, so the call will proceed and send 0 ether
    await expect(
      instance.connect(addr1).withdrawAll()
    ).to.be.reverted;
  });
});