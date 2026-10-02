import { expect } from "chai";
import { ethers } from "hardhat";

describe("BANK_SAFE mutant mb4c512f1 test", function () {
  it("should revert SetLogFile after Initialized is called, but mutant allows it", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("BANK_SAFE");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First initialize the contract
    await instance.Initialized();

    // Now try to call SetLogFile - should revert on original, but mutant allows it
    // We expect a revert, but on the mutant this call will succeed
    await expect(
      instance.SetLogFile(owner.address)
    ).to.be.reverted;
  });
});