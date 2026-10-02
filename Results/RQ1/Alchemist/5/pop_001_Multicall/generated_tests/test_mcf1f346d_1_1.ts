import { expect } from "chai";
import { ethers } from "hardhat";

describe("Multicall mutant test - mcf1f346d", function () {
  it("should execute all multicall data items when loop condition is correct", async function () {
    const [owner] = await ethers.getSigners();

    // Deploy the Multicall contract with required constructor arguments
    const MulticallFactory = await ethers.getContractFactory("Multicall");
    const multicall = await MulticallFactory.deploy();
    await multicall.waitForDeployment();

    // Create test data that would be processed by multicall
    // We'll encode function calls that should be executed
    const iface = new ethers.Interface([
      "function setValue(uint256 _value) external",
      "function getValue() external view returns (uint256)"
    ]);

    // Create multiple calldata items
    const callData1 = iface.encodeFunctionData("setValue", [42]);
    const callData2 = iface.encodeFunctionData("setValue", [100]);

    // Call multicall with multiple items
    const tx = await multicall.multicall([callData1, callData2]);
    await tx.wait();

    // If the loop condition is broken (i > data.length), no calls will execute
    // The getValue should return 0 if mutant is present (loop never runs)
    // or the last value set (100) if original code runs correctly
    const result = await multicall.getValue();

    // The original contract would have executed both calls, setting value to 100
    // The mutant would skip the loop entirely, leaving value at 0
    expect(result).to.equal(100);
  });
});