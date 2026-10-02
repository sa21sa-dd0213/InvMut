import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant m3d965f59 test", function () {
  it("should revert SetMinSum after Initialized is called", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First initialize the contract
    const txInit = await instance.Initialized();
    await txInit.wait();

    // Now try to call SetMinSum - it should revert on original but pass on mutant
    await expect(
      instance.SetMinSum(100)
    ).to.be.reverted;
  });
});