import { expect } from "chai";
import { ethers } from "hardhat";

describe("BANK_SAFE mutant test mfa1e0704", function () {
  it("should revert SetMinSum after initialization, but mutant allows it", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("BANK_SAFE");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First initialize the contract to lock the SetMinSum function
    const initTx = await instance.Initialized();
    await initTx.wait();

    // Attempt to call SetMinSum after initialization - should revert in original
    // but the mutant will allow it (removed revert())
    const newMinSum = 1000;

    // In the original contract this would revert, in the mutant it succeeds
    const tx = instance.SetMinSum(newMinSum);

    // The test expects a revert to catch the mutant that doesn't revert
    await expect(tx).to.be.reverted;
  });
});