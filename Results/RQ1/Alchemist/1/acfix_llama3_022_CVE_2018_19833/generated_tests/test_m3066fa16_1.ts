import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant detection", function () {
  it("should kill mutant m3066fa16: owned() should succeed when called by owner", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(1000, "TestToken", "TT");
    await instance.waitForDeployment();

    // The owned() function should pass when called by the owner
    // In the mutant, it will revert because of the != operator
    await expect(instance.connect(owner).owned()).to.not.be.reverted;
  });
});