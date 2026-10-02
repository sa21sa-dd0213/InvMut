import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m9316c5ec by calling addToBalance with 0 value", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Call addToBalance with 0 ether - should succeed on original, revert on mutant
    await expect(
      instance.connect(addr1).addToBalance({ value: ethers.parseEther("0") })
    ).to.be.reverted;
  });
});