import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant test - m63040b12", function () {
  it("should revert when _tos array is empty (original behavior) but mutant would not revert", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy contract (no constructor arguments needed for EBU)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Empty _tos array and empty v array
    const emptyAddresses: string[] = [];
    const emptyValues: bigint[] = [];

    // Should revert in original due to require(_tos.length > 0)
    // Mutant removed this check, so it would return true without reverting
    await expect(
      instance.connect(owner).transfer(emptyAddresses, emptyValues)
    ).to.be.reverted;
  });
});