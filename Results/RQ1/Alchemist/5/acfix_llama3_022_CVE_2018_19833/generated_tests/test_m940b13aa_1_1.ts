import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant detection - m940b13aa", function () {
  it("should detect constructor arithmetic mutation from * to +", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    
    // Deploy with a specific initialSupply, e.g., 1000 tokens
    const initialSupply = 1000;
    const tokenName = "TestToken";
    const tokenSymbol = "TT";
    
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();
    
    // In the original: totalSupply = initialSupply * 10**0 = initialSupply * 1 = initialSupply
    // In the mutant: totalSupply = initialSupply + 10**0 = initialSupply + 1
    // So for initialSupply=1000, original gives 1000, mutant gives 1001
    const expectedTotalSupply = initialSupply; // 1000
    const actualTotalSupply = await instance.totalSupply();
    
    expect(actualTotalSupply).to.equal(expectedTotalSupply);
  });
});