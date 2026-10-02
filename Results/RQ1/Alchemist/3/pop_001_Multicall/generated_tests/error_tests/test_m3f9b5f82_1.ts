import { expect } from "chai";
import { ethers } from "hardhat";

describe("Multicall mutant m3f9b5f82 test", function () {
  it("should revert when multicall is called with non-empty data array due to out-of-bounds access", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy Multicall - note: constructor arguments may be required depending on implementation
    const MulticallFactory = await ethers.getContractFactory("Multicall");
    const multicall = await MulticallFactory.deploy();
    await multicall.waitForDeployment();

    // Create a simple calldata to test multicall with non-empty array
    // We'll use a valid function selector that exists in the contract
    // The actual function call doesn't matter - we just need a non-empty array
    const testCalldata = ethers.utils.id("someFunction()").slice(0, 10);
    
    // Expect the multicall to revert due to out-of-bounds array access
    // The mutant changes i < data.length to i <= data.length, causing an extra iteration
    await expect(
      multicall.multicall([testCalldata])
    ).to.be.reverted;
  });
});