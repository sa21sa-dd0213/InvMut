import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant detection test", function () {
  it("should revert when non-owner calls setOwner (mutant removes require)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // addr1 is not the owner, so calling setOwner should revert in original
    // but mutant allows it, so this test will fail on the mutant
    await expect(
      instance.connect(addr1).setOwner(addr1.address)
    ).to.be.reverted;
  });
});