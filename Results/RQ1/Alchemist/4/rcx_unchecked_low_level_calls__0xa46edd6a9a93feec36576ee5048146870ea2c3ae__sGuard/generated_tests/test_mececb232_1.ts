import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant test - mececb232", function () {
  it("should revert when calling transfer with an empty _tos array", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const emptyAddresses: string[] = [];
    const emptyValues: bigint[] = [];

    // The original contract requires _tos.length > 0, so empty array should revert
    // The mutant has >= 0 which never reverts, so this test should fail on the mutant
    await expect(
      instance.transfer(owner.address, addr1.address, emptyAddresses, emptyValues)
    ).to.be.reverted;
  });
});