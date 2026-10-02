import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant kill test - m63040b12", function () {
  it("should revert when _tos array is empty on original, but pass on mutant (kill)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy EBU (no constructor arguments required)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Test: call transfer with empty _tos array and any v array
    const emptyAddresses: string[] = [];
    const values: bigint[] = [];

    // Original contract would revert due to require(_tos.length > 0)
    // Mutant removed this check, so it would succeed (return true)
    await expect(
      instance.connect(owner).transfer(emptyAddresses, values)
    ).to.be.reverted; // This passes on original, fails on mutant -> kills mutant
  });
});