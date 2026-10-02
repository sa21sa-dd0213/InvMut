import { expect } from "chai";
import { ethers } from "hardhat";

describe("ANCHToken mutant test for approve function", function () {
  it("should detect mutant that removes approve implementation by checking allowance", async function () {
    const [owner, spender] = await ethers.getSigners();
    
    // Deploy ANCHToken with constructor arguments
    // Note: The constructor requires _route (Uniswap router) and _USDToken addresses
    // For testing purposes, we use placeholder addresses that won't affect the approve function
    const UNISWAP_ROUTER = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
    const USD_TOKEN = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
    
    const Factory = await ethers.getContractFactory("ANCHToken");
    const instance = await Factory.deploy(UNISWAP_ROUTER, USD_TOKEN);
    await instance.waitForDeployment();

    // Test case: Call approve and verify allowance is set correctly
    const approveAmount = ethers.parseEther("100");
    
    // Call approve from owner to spender
    await instance.connect(owner).approve(spender.address, approveAmount);
    
    // Check allowance - should be equal to approveAmount on original contract
    // but will be 0 on mutant if approve implementation is removed
    const allowance = await instance.allowance(owner.address, spender.address);
    
    // This assertion will pass on original (allowance = approveAmount)
    // and fail on mutant (allowance = 0), thus killing the mutant
    expect(allowance).to.equal(approveAmount);
  });
});