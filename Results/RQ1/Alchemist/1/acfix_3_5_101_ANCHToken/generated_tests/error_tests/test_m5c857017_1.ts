import { expect } from "chai";
import { ethers } } from "hardhat";

describe("ANCHToken mutant kill test - m5c857017", function () {
  it("should detect total supply mutation from * to +", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy with required constructor arguments
    // ANCHToken constructor: constructor(address _route, address _USDToken)
    // We need a Uniswap V2 router address and a USD token address
    // For testing, we can use any addresses since we're just checking total supply
    const UNISWAP_V2_ROUTER = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
    const USD_TOKEN = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
    
    const Factory = await ethers.getContractFactory("ANCHToken");
    const instance = await Factory.deploy(UNISWAP_V2_ROUTER, USD_TOKEN);
    await instance.waitForDeployment();

    // Expected total supply: 10000000 * 10^18 = 10^25
    const expectedTotalSupply = ethers.parseEther("10000000"); // 10,000,000 * 10^18
    const actualTotalSupply = await instance.totalSupply();
    
    // The mutant computes 10000000 + 10^18 instead of 10000000 * 10^18
    // This would result in ~1.00000000000000001e21 instead of 1e25
    // The test will fail on the mutant because the values won't match
    expect(actualTotalSupply).to.equal(expectedTotalSupply);
  });
});