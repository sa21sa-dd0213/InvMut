import { expect } from "chai";
import { ethers } from "hardhat";

describe("ANCHToken mutant detection - constructor exponentiation", function () {
  it("should detect mutant where 10**_decimals is replaced with 10*_decimals", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy with mock router address and USD token address
    // For testing purposes, we use zero addresses since we only need to check totalSupply
    const mockRouter = "0x0000000000000000000000000000000000000001";
    const mockUSDToken = "0x0000000000000000000000000000000000000002";
    
    const Factory = await ethers.getContractFactory("ANCHToken");
    const instance = await Factory.deploy(mockRouter, mockUSDToken);
    await instance.waitForDeployment();
    
    // Get the total supply after deployment
    const totalSupply = await instance.totalSupply();
    
    // Expected total supply: 10,000,000 * 10^18 = 10,000,000 * 1,000,000,000,000,000,000
    const expectedSupply = ethers.parseEther("10000000"); // 10 million tokens with 18 decimals
    
    // The mutant would produce: 10,000,000 * 10 * 18 = 1,800,000,000 (which is ~1.8 * 10^9)
    // The original produces: 10,000,000 * 10^18 = 10^25 (which is 10,000,000 * 1,000,000,000,000,000,000)
    // If the total supply equals the expected value, the mutant is killed (test passes)
    // If the total supply is wrong (mutant), the assertion fails
    expect(totalSupply).to.equal(expectedSupply);
  });
});