import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant kill test - m68f98b4c", function () {
  it("should kill mutant by using v[i] = 1 (original passes, mutant reverts)", async function () {
    const [owner] = await ethers.getSigners();

    // Deploy EBU - no constructor arguments needed as per contract
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Prepare test data: v = [1] (value that passes original check)
    const tos = ["0x0000000000000000000000000000000000000001"];
    const values = [1];

    // Call transfer - should revert on mutant because 1 ** 1e18 / 1 != 1e18
    // but passes on original because 1 * 1e18 / 1 == 1e18
    const tx = instance.connect(owner).transfer(tos, values);

    // The mutant should revert, so we expect it to be reverted
    await expect(tx).to.be.reverted;
  });
});