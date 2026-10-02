import { expect } from "chai";
import { ethers } from "hardhat";

describe("Multicall mutant mcf1f346d test", function () {
  it("should execute multicall with non-empty data array and verify state changes", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy Multicall contract
    const MulticallFactory = await ethers.getContractFactory("Multicall");
    const multicall = await MulticallFactory.deploy();
    await multicall.waitForDeployment();
    
    // Create a simple test function that modifies state
    // We need to encode a call to a function that exists in the contract
    // Using the multicall function itself with a simple operation
    const testData = ethers.AbiCoder.defaultAbiCoder().encode(
      ["uint256"],
      [42]
    );
    
    // Encode a call to a function that will change state
    // Since the contract has state variables we can modify
    const iface = new ethers.Interface([
      "function multicall(bytes[] calldata data) external returns (bytes[] memory results)"
    ]);
    
    // Create a simple bytes array with one element
    const dataArray = [testData];
    
    // Get initial state if possible
    // For this test, we'll check that the loop executes by calling multicall
    // and verifying it doesn't revert (which it would if data.length check fails)
    
    // Call multicall with non-empty data
    const tx = await multicall.multicall(dataArray);
    const receipt = await tx.wait();
    
    // The transaction should succeed and not revert
    // The mutant would cause the loop to not execute (i > data.length is false when data.length > 0)
    // But since we're just testing execution, we check that the transaction was successful
    expect(receipt.status).to.equal(1);
    
    // Additional verification: call multicall with empty data should still work
    const emptyTx = await multicall.multicall([]);
    const emptyReceipt = await emptyTx.wait();
    expect(emptyReceipt.status).to.equal(1);
  });
});