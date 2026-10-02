import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m7961a6e9 by depositing a positive amount", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The mutant changes > to < in the deposit assertion.
    // A positive deposit should succeed in the original but revert in the mutant.
    const depositAmount = ethers.parseEther("1.0");
    await expect(
      instance.connect(owner).deposit({ value: depositAmount })
    ).to.not.be.reverted;
  });
});