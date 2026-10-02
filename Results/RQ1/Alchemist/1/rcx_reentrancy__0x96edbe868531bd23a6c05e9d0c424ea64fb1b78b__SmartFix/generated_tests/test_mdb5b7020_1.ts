import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant mdb5b7020 test", function () {
  it("should revert SetMinSum after initialization, but mutant allows it", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments for PENNY_BY_PENNY)
    const Factory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Step 1: Initialize the contract (set intitalized = true)
    const txInit = await instance.Initialized();
    await txInit.wait();

    // Step 2: Attempt to call SetMinSum after initialization
    // Original contract would revert because intitalized is true
    // Mutant with if(false) will not revert and will change MinSum
    const txSet = await instance.SetMinSum(100);
    await txSet.wait();

    // Step 3: Verify the mutant behavior - MinSum should be changed
    const minSum = await instance.MinSum();
    expect(minSum).to.equal(100);
  });
});