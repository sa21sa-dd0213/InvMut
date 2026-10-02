import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when _tos array is empty (mutant changes > to <, making require(_tos.length < 0) impossible to satisfy)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Test case: call transfer with empty _tos array
    // Original: require(_tos.length > 0) would revert on empty array
    // Mutant: require(_tos.length < 0) would always revert (length can't be negative)
    await expect(
      instance.transfer(
        owner.address,
        addr1.address,
        [], // empty array
        100
      )
    ).to.be.reverted;
  });
});