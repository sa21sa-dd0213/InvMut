import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant ma5675897", function () {
  it("should revert when non-owner calls owned() on original, but mutant allows it", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    // Owned contract has no constructor parameters (no constructor defined)
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // In the original contract, owned() has onlyOwner modifier so non-owner call reverts
    // The mutant removes onlyOwner, so non-owner call will succeed
    // This test should revert on original but pass on mutant, thus killing the mutant
    await expect(
      instance.connect(addr1).owned()
    ).to.be.reverted;
  });
});