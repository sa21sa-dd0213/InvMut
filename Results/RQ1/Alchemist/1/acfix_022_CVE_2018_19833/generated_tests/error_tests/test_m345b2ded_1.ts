import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant detection test", function () {
  it("should detect mutant m345b2ded by verifying totalSupply calculation", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    
    // Deploy with initialSupply = 1000
    // decimals = 0, so 10 ** 0 = 1
    // Original: totalSupply = 1000 * 1 = 1000
    // Mutant: totalSupply = 1000 + 1 = 1001
    const initialSupply = 1000;
    const tokenName = "TestToken";
    const tokenSymbol = "TST";
    
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();
    
    const totalSupply = await instance.totalSupply();
    
    // The original contract should have totalSupply = 1000
    // The mutant would have totalSupply = 1001
    // This assertion will fail on the mutant, killing it
    expect(totalSupply).to.equal(initialSupply);
  });
});