import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyContract reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m0ed959d1 by reverting when receiver is non-zero address", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MyContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Test that passes on original (receiver != address(0)) but fails on mutant
    // Mutant requires receiver == address(0), so calling with non-zero address should revert
    await expect(
      instance.connect(owner).sendTo(addr1.address, ethers.parseEther("1"))
    ).to.be.reverted;
  });
});