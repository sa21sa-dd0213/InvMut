import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant m17d86855 detection", function () {
  it("should revert SetMinSum after Initialized is called, but mutant allows it", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, initialize the contract (sets intitalized = true)
    await (await instance.Initialized()).wait();

    // Now try to call SetMinSum - in original it reverts, in mutant it succeeds
    // We expect a revert, so if the call succeeds the mutant is detected
    await expect(
      instance.SetMinSum(100)
    ).to.be.reverted;
  });
});