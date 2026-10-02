import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant kill test - m7e788696", function () {
  it("should revert when user with zero credit calls withdrawAll on original, but succeed on mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // addr1 has no credit balance, call withdrawAll - should revert on original
    await expect(
      instance.connect(addr1).withdrawAll()
    ).to.be.reverted;
  });
});