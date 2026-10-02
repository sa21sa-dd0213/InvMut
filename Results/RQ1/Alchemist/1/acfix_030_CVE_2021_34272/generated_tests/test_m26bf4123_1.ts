import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when non-owner calls owned() after modifier removal", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to call owned() from a non-owner address - should revert in original, but not in mutant
    await expect(
      instance.connect(addr1).owned()
    ).to.be.reverted;
  });
});