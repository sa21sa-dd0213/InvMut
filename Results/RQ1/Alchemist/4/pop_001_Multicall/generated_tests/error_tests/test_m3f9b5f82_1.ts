import { expect } from "chai";
import { ethers } from "hardhat";

describe("Multicall mutant m3f9b5f82 test", function () {
  it("should revert when calling multicall with empty data array due to out-of-bounds access", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy Multicall - note: this contract doesn't have a constructor in the provided code
    // It's a library, but for testing we deploy it as a contract
    const MulticallFactory = await ethers.getContractFactory("Multicall");
    const multicall = await MulticallFactory.deploy();
    await multicall.waitForDeployment();

    // Call multicall with empty data array
    // The original would iterate 0 times (0 < 0 is false)
    // The mutant would iterate 1 time (0 <= 0 is true) and access data[0] which doesn't exist
    await expect(
      multicall.multicall([])
    ).to.be.reverted;
  });
});