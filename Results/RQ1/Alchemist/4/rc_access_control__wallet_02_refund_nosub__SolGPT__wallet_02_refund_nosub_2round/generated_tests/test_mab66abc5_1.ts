import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant mab66abc5 - deposit overflow check inversion", function () {
  it("should kill the mutant by performing a normal deposit that reverts with the inverted assertion", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // A normal deposit with a positive amount should succeed on the original
    // but fail on the mutant because the assertion is inverted (checks < instead of >)
    await expect(
      instance.connect(owner).deposit({ value: ethers.parseEther("1") })
    ).to.be.reverted;
  });
});