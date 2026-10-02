import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant m7e788696 test", function () {
  it("should revert when user with zero credit tries to withdrawAll", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // addr1 has zero credit, should revert in original but succeed in mutant
    await expect(
      instance.connect(addr1).withdrawAll()
    ).to.be.reverted;
  });
});