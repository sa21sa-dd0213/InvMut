import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant m3066fa16 test", function () {
  it("should revert when owner calls owned() after the mutant changes == to !=", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(1000, "TestToken", "TTK");
    await instance.waitForDeployment();

    // The mutant changes require(msg.sender == owner) to require(msg.sender != owner)
    // This means the function will revert when called by the owner (because owner != owner is false)
    // In the original, calling from owner should succeed
    // In the mutant, calling from owner should revert
    await expect(instance.owned()).to.be.reverted;
  });
});