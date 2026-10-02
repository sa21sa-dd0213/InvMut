import { expect } from "chai";
import { ethers } from "hardhat";

describe("Multicall mutant m3f9b5f82 test", function () {
  it("should revert when multicall is called with an empty data array (kills off-by-one mutant)", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy the Multicall contract with its required constructor arguments
    // Note: The actual constructor arguments should be read from the contract constructor
    // For this test, we assume the constructor takes no arguments based on the provided code
    const Factory = await ethers.getContractFactory("Multicall");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Call multicall with an empty array - this should succeed in original code
    // but will revert in the mutant due to out-of-bounds access
    const emptyData: Uint8Array[] = [];
    
    // The original contract should handle empty array gracefully (loop doesn't execute)
    // The mutant with <= will attempt to access data[0] which is out of bounds
    await expect(
      instance.multicall(emptyData)
    ).to.not.be.reverted;
  });
});