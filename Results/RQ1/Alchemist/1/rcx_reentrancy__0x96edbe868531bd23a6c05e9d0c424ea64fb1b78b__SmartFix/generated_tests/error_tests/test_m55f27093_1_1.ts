import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant m55f27093 detection", function () {
  it("should revert Collect when balance < MinSum in original, but mutant allows it", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Set MinSum to a non-zero value
    const minSum = ethers.parseEther("1");
    await instance.SetMinSum(minSum);

    // Initialize the contract (set intitalized = true to prevent further changes)
    await instance.Initialized();

    // addr1 puts some ETH but less than MinSum
    const putAmount = ethers.parseEther("0.5");
    await instance.connect(addr1).Put(0, { value: putAmount });

    // Now try to collect - balance (0.5) < MinSum (1.0), and also unlockTime hasn't passed
    // In original this should revert; in mutant it would succeed
    await expect(
      instance.connect(addr1).Collect(putAmount)
    ).to.be.reverted;
  });
});