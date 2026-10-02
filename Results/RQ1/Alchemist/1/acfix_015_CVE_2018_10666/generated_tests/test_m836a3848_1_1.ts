import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant detection test", function () {
  it("should revert when non-owner calls setOwner after the onlyOwner modifier is removed", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // addr1 is not the owner, so this call should revert in the original contract
    // but succeed in the mutant where the require is removed
    await expect(
      instance.connect(addr1).setOwner(addr1.address)
    ).to.be.reverted;
  });
});