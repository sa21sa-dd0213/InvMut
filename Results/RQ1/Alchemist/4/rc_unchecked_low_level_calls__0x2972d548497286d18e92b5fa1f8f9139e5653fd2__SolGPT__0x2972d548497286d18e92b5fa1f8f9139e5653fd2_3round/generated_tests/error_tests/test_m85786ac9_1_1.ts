import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant test - m85786ac9", function () {
  it("should revert when _tos array is empty (kills mutant that removes require check)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Prepare empty arrays for _tos and v
    const emptyAddresses: string[] = [];
    const emptyValues: bigint[] = [];

    // Attempt to call transfer with empty _tos array
    // Original contract would revert due to require(_tos.length > 0)
    // Mutant without this check would not revert, killing the mutant
    await expect(
      instance.transfer(owner.address, addr1.address, emptyAddresses, emptyValues)
    ).to.be.reverted;
  });
});