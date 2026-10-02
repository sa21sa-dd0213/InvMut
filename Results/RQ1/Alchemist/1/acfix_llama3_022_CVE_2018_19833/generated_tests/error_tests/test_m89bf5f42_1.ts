import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant detection - constructor exponentiation bug", function () {
  it("should detect mutant that uses ** instead of * in totalSupply calculation", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    
    // Use decimals = 18 (non-zero) and initialSupply = 1000
    const initialSupply = 1000;
    const decimals = 18;
    const expectedTotalSupply = initialSupply * (10 ** decimals);
    
    const instance = await Factory.deploy(initialSupply, "TestToken", "TT");
    await instance.waitForDeployment();
    
    const actualTotalSupply = await instance.totalSupply();
    
    // The original contract: totalSupply = initialSupply * 10 ** uint256(decimals)
    // The mutant: totalSupply = initialSupply ** 10 ** uint256(decimals)
    // For initialSupply=1000 and decimals=18, the mutant would produce an astronomically large number
    // that does NOT equal expectedTotalSupply
    expect(actualTotalSupply).to.equal(expectedTotalSupply);
  });
});