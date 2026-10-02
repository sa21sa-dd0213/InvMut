import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when non-owner calls owned() in original, but succeed in mutant without modifier", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The mutant removes the onlyOwner modifier from owned()
    // In the original, calling owned() from a non-owner should revert
    // In the mutant, it should succeed (no revert)
    // We test that the original reverts, so the mutant will fail this test
    await expect(
      instance.connect(addr1).owned()
    ).to.be.reverted;
  });
});