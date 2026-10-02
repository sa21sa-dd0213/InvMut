import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant detection", function () {
  it("should detect mutant where >= replaces > in withdrawAll condition", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // addr1 has zero credit initially - call withdrawAll should revert on original
    // but succeed on mutant (>= 0 passes for zero credit)
    const tx = instance.connect(addr1).withdrawAll();

    // On original contract, this would revert because 0 > 0 is false
    // On mutant, this would succeed because 0 >= 0 is true
    await expect(tx).to.be.reverted;
  });
});