import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant kill test - mde048cf8", function () {
  it("should revert when sending 0 wei in Put due to msg.value-1 underflow in mutant", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PENNY_BY_PENNY");
    // Deploy without constructor arguments (contract has no constructor)
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract (required before Put can be called with _lockTime)
    await instance.Initialized();

    // Attempt to call Put with 0 wei and any lock time
    // Original: require((acc.balance + 0) >= acc.balance) → passes
    // Mutant: require((acc.balance + 0 - 1) >= acc.balance) → underflow revert
    await expect(
      instance.Put(0, { value: 0 })
    ).to.be.reverted;
  });
});