import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when _tos array is empty (original require check) - kills mutant that removes the require", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The original contract has require(_tos.length > 0), so passing empty array should revert
    // The mutant removes this require, so it would NOT revert - making the test fail on mutant
    await expect(
      instance.transfer(
        owner.address,
        addr1.address,
        [],           // empty _tos array
        []            // empty v array (must match length of _tos)
      )
    ).to.be.reverted;
  });
});