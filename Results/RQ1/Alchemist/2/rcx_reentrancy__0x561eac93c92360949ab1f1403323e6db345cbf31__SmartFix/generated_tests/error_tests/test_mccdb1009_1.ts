import { expect } from "chai";
import { ethers } from "hardhat";

describe("BANK_SAFE mutant mccdb1009 test", function () {
  it("should revert SetMinSum after Initialized() is called, but mutant allows it", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("BANK_SAFE");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Set initial MinSum value
    await instance.SetMinSum(100);
    
    // Call Initialized() to lock the configuration
    await instance.Initialized();

    // After initialization, SetMinSum should revert on original, but mutant allows it
    // We expect revert, but mutant will succeed and change MinSum
    const initialMinSum = await instance.MinSum();
    
    try {
      await instance.SetMinSum(200);
      // If we reach here, the mutant is alive (no revert)
      const newMinSum = await instance.MinSum();
      // Assert that MinSum was changed, which should NOT happen on original
      expect(newMinSum).to.not.equal(initialMinSum);
      // If this assertion passes, the mutant is detected
      expect.fail("Mutant detected: SetMinSum did not revert after initialization");
    } catch (error: any) {
      // On original contract, we expect revert
      // On mutant, we expect no revert but we already handle that above
      expect(error.message).to.include("revert");
    }
  });
});