import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant m54aa401a test", function () {
  it("should revert deposit because mutant assertion always fails", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to deposit 1 wei - the mutant assertion will always fail
    await expect(
      instance.connect(owner).deposit({ value: ethers.parseEther("1") })
    ).to.be.reverted;
  });
});