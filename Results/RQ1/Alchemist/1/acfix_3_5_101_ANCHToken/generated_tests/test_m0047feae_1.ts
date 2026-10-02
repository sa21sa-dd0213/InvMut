import { expect } from "chai";
import { ethers } } from "hardhat";

describe("ANCHToken mutant test - totalSupply", function () {
  it("should return the correct total supply after deployment", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy with required constructor arguments
    // The constructor requires: address _route, address _USDToken
    // We'll use a mock router and a mock USD token address
    const mockRouter = "0x0000000000000000000000000000000000000001";
    const mockUSDToken = "0x0000000000000000000000000000000000000002";
    
    const Factory = await ethers.getContractFactory("ANCHToken");
    const instance = await Factory.deploy(mockRouter, mockUSDToken);
    await instance.waitForDeployment();
    
    // The initial total supply is 10000000 * 10^18 = 10,000,000 * 1e18
    const expectedTotalSupply = ethers.parseEther("10000000");
    
    // Call totalSupply() and assert it returns the expected value
    const totalSupply = await instance.totalSupply();
    
    // This assertion should fail on the mutant because the mutant removes the return statement,
    // causing totalSupply() to return 0 instead of the actual total supply
    expect(totalSupply).to.equal(expectedTotalSupply);
  });
});