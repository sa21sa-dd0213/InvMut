import { expect } from "chai";
import { ethers } from "hardhat";

describe("Multicall mutant detection - loop condition change", function () {
  it("should execute all calls in multicall and detect state changes", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the Multicall contract (assuming no constructor arguments based on the provided code)
    const MulticallFactory = await ethers.getContractFactory("Multicall");
    const multicall = await MulticallFactory.deploy();
    await multicall.waitForDeployment();
    
    // Create a simple test contract that has a state variable we can change
    const TestContractFactory = await ethers.getContractFactory("TestContract");
    const testContract = await TestContractFactory.deploy();
    await testContract.waitForDeployment();
    
    // Encode the function call to increment a counter
    const incrementData = testContract.interface.encodeFunctionData("increment");
    
    // Create an array with multiple calls to ensure the loop iterates
    const calls = [incrementData, incrementData, incrementData];
    
    // Call multicall with the array of calls
    const tx = await multicall.multicall(calls);
    const receipt = await tx.wait();
    
    // Check that the calls were actually executed by verifying state changes
    // The test contract's counter should be 3 if all 3 calls were executed
    const counter = await testContract.counter();
    expect(counter).to.equal(3);
    
    // Additionally verify that we got results back from multicall
    // The results array should have 3 entries if the loop executed properly
    const results = await multicall.callStatic.multicall(calls);
    expect(results.length).to.equal(3);
  });
});