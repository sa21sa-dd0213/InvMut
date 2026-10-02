import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant m43cc4e05 test", function () {
  it("should detect mutant that replaces * with ** in constructor totalSupply calculation", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    
    // Deploy with initialSupply = 1 and decimals = 18 (default)
    // Original: totalSupply = 1 * 10**18 = 10^18
    // Mutant:   totalSupply = 1 ** 10**18 = 1^10^18 = 1
    const instance = await Factory.deploy(1, "TestToken", "TST");
    await instance.waitForDeployment();
    
    const expectedTotalSupply = ethers.parseEther("1"); // 1 * 10^18
    const actualTotalSupply = await instance.totalSupply();
    
    // Mutant would set totalSupply to 1, not 10^18
    expect(actualTotalSupply).to.equal(expectedTotalSupply);
    
    // Also verify owner balance matches totalSupply
    const ownerBalance = await instance.balanceOf(owner.address);
    expect(ownerBalance).to.equal(expectedTotalSupply);
  });
});