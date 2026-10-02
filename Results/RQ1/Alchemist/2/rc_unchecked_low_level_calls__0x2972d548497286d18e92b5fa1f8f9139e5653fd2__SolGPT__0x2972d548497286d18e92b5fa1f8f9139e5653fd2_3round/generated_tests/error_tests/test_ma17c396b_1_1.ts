import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant kill test - ma17c396b", function () {
  it("should revert when calling transfer with empty _tos array on original, but mutant changes require to _tos.length < 0 making all calls revert", async function () {
    const [owner, from, to] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The mutant changes require(_tos.length > 0) to require(_tos.length < 0)
    // Since array length can never be negative, any valid call will revert
    // We'll call with a valid non-empty _tos array and expect a revert
    const recipients = [to.address];
    const values = [100];

    await expect(
      instance.transfer(from.address, to.address, recipients, values)
    ).to.be.reverted;
  });
});