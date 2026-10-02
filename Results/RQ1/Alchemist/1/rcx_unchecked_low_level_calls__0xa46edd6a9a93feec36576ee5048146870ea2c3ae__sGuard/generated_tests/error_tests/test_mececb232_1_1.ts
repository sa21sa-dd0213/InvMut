import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant kill test - mececb232", function () {
  it("should revert on empty _tos array (length 0) for original, but pass on mutant", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Setup: create a fake token address (any address, as call will fail but revert should happen first)
    const fakeToken = ethers.Wallet.createRandom().address;
    const emptyAddresses: string[] = [];
    const emptyValues: bigint[] = [];

    // The test: calling with empty arrays should revert on original (require _tos.length > 0)
    // On mutant it will pass (require _tos.length >= 0 is always true)
    await expect(
      instance.transfer(owner.address, fakeToken, emptyAddresses, emptyValues)
    ).to.be.reverted;
  });
});