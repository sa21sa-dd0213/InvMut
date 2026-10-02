import { expect } from "chai";
import { ethers } from "hardhat";

describe("BANK_SAFE mutant kill test - meaf1fdda", function () {
  it("should kill the mutant by calling SetMinSum before Initialized, expecting success on original but revert on mutant", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("BANK_SAFE");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // On the original contract, calling SetMinSum before Initialized() should succeed
    // because intitalized is false. The mutant changes the check to if(true)revert(),
    // so it will always revert, killing the mutant.
    const newMinSum = 100;
    await expect(instance.SetMinSum(newMinSum)).to.not.be.reverted;
    
    // Verify the value was set correctly
    const storedMinSum = await instance.MinSum();
    expect(storedMinSum).to.equal(newMinSum);
  });
});