import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when depositing zero value (detects mutant that changed > to >=)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to deposit 0 wei - original contract reverts, mutant allows it
    await expect(
      instance.connect(owner).deposit({ value: 0 })
    ).to.be.reverted;
  });
});