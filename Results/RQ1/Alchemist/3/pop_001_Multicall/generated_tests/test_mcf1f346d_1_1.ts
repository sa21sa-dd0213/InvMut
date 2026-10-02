import { expect } from "chai";
import { ethers } from "hardhat";

describe("Multicall mutant detection test", function () {
  it("should kill mutant mcf1f346d by verifying loop execution in multicall", async function () {
    const [owner] = await ethers.getSigners();

    // Deploy a minimal test contract that uses the Multicall library
    // We need to deploy the actual main contract that contains the multicall function
    // Since the contract is complex, we'll deploy a simple test harness
    
    // First, deploy the libraries that the main contract depends on
    const Multicall = await ethers.getContractFactory("Multicall");
    const multicall = await Multicall.deploy();
    await multicall.waitForDeployment();

    const Address = await ethers.getContractFactory("Address");
    const address = await Address.deploy();
    await address.waitForDeployment();

    const FixedPointMathLib = await ethers.getContractFactory("FixedPointMathLib");
    const fixedPointMathLib = await FixedPointMathLib.deploy();
    await fixedPointMathLib.waitForDeployment();

    const Math = await ethers.getContractFactory("Math", {
      libraries: {
        FixedPointMathLib: await fixedPointMathLib.getAddress()
      }
    });
    const math = await Math.deploy();
    await math.waitForDeployment();

    // Deploy a simple test contract that uses the multicall pattern
    const TestMulticall = await ethers.getContractFactory("TestMulticall");
    const testInstance = await TestMulticall.deploy();
    await testInstance.waitForDeployment();

    // Prepare test data - a simple function call that modifies state
    const testData = testInstance.interface.encodeFunctionData("testFunction");

    // Call multicall with a non-empty array
    const tx = await testInstance.multicall([testData]);
    const receipt = await tx.wait();

    // Check that the state was modified (loop executed)
    const result = await testInstance.testValue();

    // The original should have executed the call and set the value
    expect(result).to.equal(1);
  });
});