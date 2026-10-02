import { expect } from "chai";
import { ethers } } from "hardhat";

describe("MONEY_BOX mutant test - SetMinSum", function () {
  it("should allow SetMinSum before Initialized and detect mutant that always reverts", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The original contract allows SetMinSum before Initialized()
    // The mutant (if(true) revert()) will always revert even before Initialized
    await expect(instance.SetMinSum(100)).to.not.be.reverted;

    // Verify the MinSum was actually set
    const minSum = await instance.MinSum();
    expect(minSum).to.equal(100);
  });
});