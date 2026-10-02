import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant test - constructor arithmetic", function () {
  it("should detect mutant that changes multiplication to addition in totalSupply calculation", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    
    // Deploy with a specific initialSupply
    const initialSupply = 1000;
    const decimals = 0;
    const expectedTotalSupply = initialSupply * 10 ** decimals; // 1000 * 1 = 1000
    
    const instance = await Factory.deploy(initialSupply, "TestToken", "TST");
    await instance.waitForDeployment();
    
    const totalSupply = await instance.totalSupply();
    
    // The original contract would have totalSupply = initialSupply * 1 = initialSupply
    // The mutant would have totalSupply = initialSupply + 1
    expect(totalSupply).to.equal(expectedTotalSupply);
  });
});