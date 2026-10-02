import { expect } from "chai";
import { ethers } from "hardhat";

describe("Multicall mutant detection - m3f9b5f82", function () {
  it("should detect out-of-bounds array access when calling multicall with a non-empty array", async function () {
    const [owner] = await ethers.getSigners();

    // Deploy Multicall - note: this contract appears to be a library, so we deploy it
    // The contract has no constructor arguments as it's a library with internal functions
    const MulticallFactory = await ethers.getContractFactory("Multicall");
    const multicall = await MulticallFactory.deploy();
    await multicall.waitForDeployment();

    // Create a simple calldata array with one element
    // We need to encode a function call that exists on the contract
    // Since multicall calls delegatecall to address(this), we need a function that exists
    // Let's use a simple view function that returns nothing - we can encode an empty function call
    // The contract doesn't have external functions we can call directly, but we can use a dummy call
    // Since we're testing the loop boundary, any single element array should trigger the bug

    // Create an array with one empty bytes element
    const data = ["0x"];

    // The original contract should execute successfully with 1 element
    // The mutant will try to access data[1] which doesn't exist and revert
    await expect(
      multicall.multicall(data)
    ).to.be.reverted;
  });
});