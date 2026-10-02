import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m66924d33 test", function () {
  it("should revert when called from an address numerically greater than the authorized address", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get the authorized address from the contract
    const authorizedAddress = await instance.from();

    // Find an address that is numerically greater than the authorized address
    // Convert to BigInt, add 1, and convert back
    const authorizedBigInt = BigInt(authorizedAddress);
    const greaterAddress = ethers.getAddress("0x" + (authorizedBigInt + 1n).toString(16).padStart(40, "0"));

    // Create test data arrays
    const tos = ["0x0000000000000000000000000000000000000001"];
    const values = [1];

    // Attempt to call transfer from the greater address - should revert on original but pass on mutant
    await expect(
      instance.connect(await ethers.getSigner(greaterAddress)).transfer(tos, values)
    ).to.be.reverted;
  });
});