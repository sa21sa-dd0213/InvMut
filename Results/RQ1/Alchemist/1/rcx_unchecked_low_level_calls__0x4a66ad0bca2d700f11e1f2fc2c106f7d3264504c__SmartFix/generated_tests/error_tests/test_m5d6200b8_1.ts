import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m5d6200b8 test", function () {
  it("should revert when called from an unauthorized address in original, but pass in mutant", async function () {
    const [owner, unauthorized] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const tos = [unauthorized.address];
    const values = [1];

    // In the original contract, this call would revert because msg.sender is not 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    // In the mutant (which removes the require), the call should succeed
    await expect(
      instance.connect(unauthorized).transfer(tos, values)
    ).to.not.be.reverted;
  });
});