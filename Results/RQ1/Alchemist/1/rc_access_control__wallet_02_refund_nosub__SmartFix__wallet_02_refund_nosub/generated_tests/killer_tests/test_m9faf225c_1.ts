import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant test for m9faf225c", function () {
  it("should revert when depositing zero ether (kills mutant with >= instead of >)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to deposit 0 ether - should revert in original due to strict > check
    // Mutant allows it because 0 >= 0 passes the assertion
    await expect(
      instance.connect(owner).deposit({ value: ethers.parseEther("0") })
    ).to.be.reverted;
  });
});