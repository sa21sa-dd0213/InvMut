import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant mda61a145 test", function () {
  it("should kill the mutant by calling transfer with a non-empty array of recipients", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The test: call transfer with a non-empty _tos array
    // On original contract: require(_tos.length > 0) passes, call succeeds
    // On mutant: require(_tos.length < 0) always fails, call reverts
    const recipients = [addr2.address];
    const amount = ethers.parseEther("1");

    // We expect the call to revert on the mutant, but succeed on the original
    // This test will pass on the mutant (detecting the bug) if we expect revert
    await expect(
      instance.transfer(owner.address, addr1.address, recipients, amount)
    ).to.be.reverted;
  });
});