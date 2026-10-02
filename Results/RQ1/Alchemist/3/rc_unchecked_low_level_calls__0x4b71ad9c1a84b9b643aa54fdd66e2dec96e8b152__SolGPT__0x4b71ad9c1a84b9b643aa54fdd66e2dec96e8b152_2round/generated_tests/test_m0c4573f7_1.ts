import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when _tos array is empty (kills mutant that removed require(_tos.length > 0))", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Call transfer with an empty _tos array - original reverts, mutant would return true
    await expect(
      instance.transfer(
        owner.address,
        addr1.address,
        [], // empty _tos array
        100
      )
    ).to.be.reverted;
  });
});