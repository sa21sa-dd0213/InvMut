import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should detect mutant m940b13aa where totalSupply uses addition instead of multiplication", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    
    // Deploy with initialSupply = 100 and decimals = 0 (default)
    const initialSupply = 100;
    const tokenName = "TestToken";
    const tokenSymbol = "TST";
    
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();
    
    // Expected totalSupply: initialSupply * 10^decimals = 100 * 1 = 100
    const expectedTotalSupply = BigInt(initialSupply) * BigInt(10) ** BigInt(0); // = 100n
    
    const actualTotalSupply = await instance.totalSupply();
    
    // Mutant would produce: initialSupply + 10^decimals = 100 + 1 = 101
    // Original would produce: initialSupply * 10^decimals = 100 * 1 = 100
    // This assertion kills the mutant because the mutant returns 101 instead of 100
    expect(actualTotalSupply).to.equal(expectedTotalSupply);
  });
});