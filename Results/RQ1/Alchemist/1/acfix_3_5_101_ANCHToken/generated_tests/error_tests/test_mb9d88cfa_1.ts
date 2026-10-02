import { expect } from "chai";
import { ethers } from "hardhat";

describe("ANCHToken mutant mb9d88cfa - decimals function", function () {
  it("should return 18 for decimals() in the original contract, but the mutant returns 0", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy with constructor arguments: _route and _USDToken
    // We need to provide a Uniswap V2 router address and a USD token address
    // For testing purposes, we can use the zero address as a placeholder
    // Note: The actual contract will fail to create a pair, but decimals() is a pure view function
    // that doesn't depend on the constructor's logic
    
    const Factory = await ethers.getContractFactory("ANCHToken");
    
    // Since the constructor requires real Uniswap V2 router and token addresses,
    // we'll need to deploy with addresses that won't cause reverts
    // For testing decimals() specifically, we can use any addresses as the function
    // doesn't depend on deployment success
    
    // Deploy with dummy addresses (the constructor will attempt to create a pair,
    // but decimals() can still be called)
    const instance = await Factory.deploy(
      "0x0000000000000000000000000000000000000001", // _route
      "0x0000000000000000000000000000000000000002"  // _USDToken
    );
    
    // Wait for deployment
    await instance.waitForDeployment();
    
    // Call decimals() function
    const decimals = await instance.decimals();
    
    // The original contract returns 18, the mutant returns 0
    expect(decimals).to.equal(18);
  });
});