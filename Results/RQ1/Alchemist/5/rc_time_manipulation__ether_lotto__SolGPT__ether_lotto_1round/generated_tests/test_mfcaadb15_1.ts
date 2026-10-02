import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant test - mfcaadb15", function () {
  it("should revert when sending an amount other than exactly 10 wei (mutant removes require)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Try to call play() with 5 wei instead of the required 10 wei
    // The original contract would revert, but the mutant would not
    await expect(
      instance.connect(addr1).play({ value: 5 })
    ).to.be.reverted;
  });
});