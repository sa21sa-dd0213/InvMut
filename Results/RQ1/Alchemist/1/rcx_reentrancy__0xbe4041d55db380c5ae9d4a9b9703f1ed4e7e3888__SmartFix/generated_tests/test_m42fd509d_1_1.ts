import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant m42fd509d test", function () {
  it("should detect mutant by verifying Put succeeds with non-zero value", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First initialize the contract to allow operations
    await instance.Initialized();

    // Call Put with a non-zero value - should succeed on original, fail on mutant
    const tx = instance.connect(addr1).Put(100, { value: ethers.parseEther("1.0") });

    // Expect the transaction to succeed (original behavior)
    await expect(tx).to.not.be.reverted;
  });
});