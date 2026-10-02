import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract - Kill mutant m3cd17041", function () {
  it("should revert when tos array is empty (length 0) - kills mutant that changed > to >=", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create empty arrays for tos and vs
    const emptyTos: string[] = [];
    const emptyVs: bigint[] = [];

    // Call with empty tos array - should revert in original (length > 0)
    // Mutant allows it (length >= 0) so this test kills the mutant
    await expect(
      instance.transfer(addr1.address, emptyTos, emptyVs)
    ).to.be.reverted;
  });
});