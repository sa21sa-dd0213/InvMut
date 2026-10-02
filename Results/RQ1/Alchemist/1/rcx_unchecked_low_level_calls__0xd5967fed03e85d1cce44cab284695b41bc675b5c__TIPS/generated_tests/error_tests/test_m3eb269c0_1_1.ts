import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant kill test - m3eb269c0", function () {
  it("should revert when _tos array is empty (mutant removed require check)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The mutant removes require(_tos.length > 0), so calling with empty array
    // will NOT revert on the mutant, but SHOULD revert on the original.
    // We deploy the original (since mutant is simulated via the test expectation).
    // To kill the mutant, we assert that calling with empty array reverts.
    // The mutant would NOT revert, so the test fails on the mutant.
    await expect(
      instance.transfer(
        owner.address,
        addr1.address,
        [],
        100
      )
    ).to.be.reverted;
  });
});