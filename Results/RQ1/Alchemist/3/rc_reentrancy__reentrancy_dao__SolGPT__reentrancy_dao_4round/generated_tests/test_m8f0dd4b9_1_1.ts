import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when user with zero credit calls withdrawAll (kills mutant m8f0dd4b9)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // addr1 has zero credit, call withdrawAll - should revert in original but succeed in mutant
    await expect(
      instance.connect(addr1).withdrawAll()
    ).to.be.reverted;
  });
});