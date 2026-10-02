import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant test - m54aa401a", function () {
  it("should succeed on deposit with positive value, but mutant should revert", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to deposit 1 ether - should succeed in original, but mutant's assert will always fail
    await expect(
      instance.connect(owner).deposit({ value: ethers.parseEther("1") })
    ).to.be.reverted;
  });
});