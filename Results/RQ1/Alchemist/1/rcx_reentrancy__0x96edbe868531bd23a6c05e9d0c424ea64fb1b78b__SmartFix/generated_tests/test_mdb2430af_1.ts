import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant mdb2430af detection", function () {
  it("should succeed with a positive msg.value on original but revert on mutant (== instead of >=)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethert.getContractFactory("PENNY_BY_PENNY");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Set MinSum to 0 to allow Collect later (not needed for this test)
    // First initialize the contract (required before Put)
    await (await instance.SetMinSum(0)).wait();
    await (await instance.Initialized()).wait();

    // Attempt to call Put with a positive msg.value (1 wei)
    // On original: should succeed because (0 + 1) >= 0 is true
    // On mutant: should revert because (0 + 1) == 0 is false
    await expect(
      instance.Put(100, { value: ethers.parseEther("0.000000000000000001") })
    ).to.not.be.reverted;
  });
});