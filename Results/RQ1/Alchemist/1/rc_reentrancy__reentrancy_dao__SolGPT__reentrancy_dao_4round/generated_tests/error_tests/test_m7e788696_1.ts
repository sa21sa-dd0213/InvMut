import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant test - m7e788696", function () {
  it("should revert when user with zero credit tries to withdrawAll", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // addr1 has zero credit, calling withdrawAll should fail on original contract
    // but mutant allows it and will try to send 0 ether, which should revert
    await expect(
      instance.connect(addr1).withdrawAll()
    ).to.be.reverted;
  });
});