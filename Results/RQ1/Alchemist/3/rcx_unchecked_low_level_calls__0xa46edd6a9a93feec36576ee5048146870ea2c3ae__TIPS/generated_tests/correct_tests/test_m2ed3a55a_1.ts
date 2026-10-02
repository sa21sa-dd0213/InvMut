import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m2ed3a55a test", function () {
  it("should kill the mutant by calling transfer with one recipient and expecting success", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Prepare test data: single recipient with a value
    const tos = [addr2.address];
    const values = [ethers.parseEther("1")];

    // Call transfer with one recipient - should succeed on original, revert on mutant
    await expect(
      instance.transfer(owner.address, addr1.address, tos, values)
    ).to.not.be.reverted;
  });
});