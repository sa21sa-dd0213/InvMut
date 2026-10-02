import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant kill test - mececb232", function () {
  it("should revert when _tos array is empty (original behavior) - mutant fails this", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const tokenAddress = ethers.ZeroAddress; // dummy token address
    const emptyAddresses: string[] = [];
    const emptyValues: bigint[] = [];

    // The original contract requires _tos.length > 0, so empty array should revert
    // The mutant with >= 0 will not revert, thus the test kills the mutant
    await expect(
      instance.transfer(owner.address, tokenAddress, emptyAddresses, emptyValues)
    ).to.be.reverted;
  });
});