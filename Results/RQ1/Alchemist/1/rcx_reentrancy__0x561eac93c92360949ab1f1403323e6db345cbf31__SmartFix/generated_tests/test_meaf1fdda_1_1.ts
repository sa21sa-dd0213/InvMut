import { expect } from "chai";
import { ethers } from "hardhat";

describe("BANK_SAFE mutant kill test - meaf1fdda", function () {
  it("should allow SetMinSum before initialization (original behavior) but mutant reverts unconditionally", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("BANK_SAFE");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Call SetMinSum BEFORE Initialized() - should succeed in original, revert in mutant
    // Original: intitalized is false, so if(intitalized)revert() does not trigger
    // Mutant: if(true)revert() always triggers, so the call reverts
    await expect(
      instance.SetMinSum(100)
    ).to.not.be.reverted;

    // Verify the value was set
    expect(await instance.MinSum()).to.equal(100);
  });
});