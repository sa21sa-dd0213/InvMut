import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant test", function () {
  it("should kill mutant m622a2908: owner can call onlyOwner function without revert", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    // Contract has no constructor arguments (no constructor defined)
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // In original: owner can call owned() successfully
    // In mutant: require(msg.sender != owner) reverts for owner
    // So calling from owner should revert in mutant, but succeed in original
    // We assert it does NOT revert, which will fail on the mutant
    await expect(instance.connect(owner).owned()).to.not.be.reverted;
  });
});