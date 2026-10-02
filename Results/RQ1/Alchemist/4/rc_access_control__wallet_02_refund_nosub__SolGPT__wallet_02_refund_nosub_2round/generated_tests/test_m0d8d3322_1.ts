import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant m0d8d3322 - deposit with zero value", function () {
  it("should revert when depositing 0 ether (original behavior)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to deposit 0 ether - should revert in original due to assertion
    await expect(
      instance.connect(owner).deposit({ value: ethers.parseEther("0") })
    ).to.be.reverted;
  });
});