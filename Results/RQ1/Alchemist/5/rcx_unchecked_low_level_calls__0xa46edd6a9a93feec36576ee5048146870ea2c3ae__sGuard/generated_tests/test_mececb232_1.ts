import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU reference (ethers v6)", function () {
  it("should revert when _tos array is empty (original behavior) - kills mutant mececb232", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Empty _tos array and corresponding empty v array
    const emptyAddresses: string[] = [];
    const emptyValues: bigint[] = [];

    // The original contract reverts with require(_tos.length > 0) when empty
    // The mutant uses >= 0 which always passes, so this will not revert on mutant
    await expect(
      instance.transfer(owner.address, addr1.address, emptyAddresses, emptyValues)
    ).to.be.reverted;
  });
});