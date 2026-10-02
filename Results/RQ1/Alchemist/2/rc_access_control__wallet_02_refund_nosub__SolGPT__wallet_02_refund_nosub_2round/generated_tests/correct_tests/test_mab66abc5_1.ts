import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should allow deposit with positive amount - kills mutant mab66abc5", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to deposit 1 wei from addr1 - should succeed in original, but mutant assertion (<) will revert
    const depositAmount = ethers.parseEther("0.0001");
    await expect(
      instance.connect(addr1).deposit({ value: depositAmount })
    ).to.not.be.reverted;
  });
});