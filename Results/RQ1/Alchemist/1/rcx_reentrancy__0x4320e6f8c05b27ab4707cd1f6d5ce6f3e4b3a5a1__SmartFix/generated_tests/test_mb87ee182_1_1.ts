import { expect } from "chai";
import { ethers } from "hardhat";

describe("ACCURAL_DEPOSIT mutant kill test for SetLogFile", function () {
  it("should succeed calling SetLogFile before Initialized in original, but revert in mutant", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ACCURAL_DEPOSIT");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Test: calling SetLogFile before Initialized should succeed in original
    // but in the mutant (if(true)revert) it will always revert
    const testAddress = "0x0486cF65A2F2F3A392CBEa398AFB7F5f0B72FF46";
    const tx = instance.SetLogFile(testAddress);

    // If the mutant is present, this call will revert; if original, it succeeds
    await expect(tx).to.not.be.reverted;

    // Verify the Log was actually set to confirm original behavior
    const logAddress = await instance.Log();
    expect(logAddress).to.equal(testAddress);
  });
});