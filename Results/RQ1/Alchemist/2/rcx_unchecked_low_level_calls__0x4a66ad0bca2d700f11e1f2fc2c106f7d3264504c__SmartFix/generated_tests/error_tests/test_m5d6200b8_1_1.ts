import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m5d6200b8 test", function () {
  it("should revert when called from unauthorized address (mutant removed require check)", async function () {
    const [owner, unauthorized] = await ethers.getSigners();

    // Deploy contract (no constructor arguments needed based on contract code)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Prepare test data
    const tos = [ethers.ZeroAddress]; // valid address array with at least one element
    const values = [1]; // non-zero value to pass the arithmetic check

    // Call from unauthorized address - should revert in original but pass in mutant
    await expect(
      instance.connect(unauthorized).transfer(tos, values)
    ).to.be.reverted;
  });
});