import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when _tos array is empty (original behavior) - kills mutant that uses >= 0", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The mutant changes require(_tos.length > 0) to require(_tos.length >= 0)
    // An empty array should revert on the original but pass on the mutant
    await expect(
      instance.transfer(
        owner.address,
        addr1.address,
        [],  // empty _tos array
        100
      )
    ).to.be.reverted;
  });
});