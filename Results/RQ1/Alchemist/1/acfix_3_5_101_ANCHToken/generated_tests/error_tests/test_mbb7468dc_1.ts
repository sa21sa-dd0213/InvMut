import { expect } from "chai";
import { ethers } from "hardhat";

describe("ANCHToken mutant detection - tokenFromReflection", function () {
  it("should detect mutant that changes <= to >= in tokenFromReflection", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy with constructor arguments (router address and USD token address)
    // For testing we can use any addresses since we're just testing the view function
    const routerAddress = "0x0000000000000000000000000000000000000001";
    const usdTokenAddress = "0x0000000000000000000000000000000000000002";
    
    const Factory = await ethers.getContractFactory("ANCHToken");
    const instance = await Factory.deploy(routerAddress, usdTokenAddress);
    await instance.waitForDeployment();

    // Get the total reflection supply (_rTotal) which is stored in the contract
    // We can calculate it: rTotal = (MAX - (MAX % _tTotal)) where MAX = 2^256 - 1
    // _tTotal = 10000000 * 10^18
    const totalSupply = await instance.totalSupply();
    
    // Get the reflection balance of the owner after minting
    // The owner should have all tokens initially, which means rOwned[owner] = _rTotal
    // tokenFromReflection with the owner's balance should work in the original
    
    // Call tokenFromReflection with the total supply as reflection amount
    // This should work on the original (rAmount <= _rTotal)
    // But fail on the mutant (rAmount >= _rTotal) - actually both would work for equal values
    
    // To properly kill the mutant, we need a value LESS than _rTotal
    // Let's use a smaller reflection amount, like 1 wei
    const reflectionAmount = ethers.parseEther("1"); // This is a small reflection amount
    
    // The original contract should allow this since 1 <= _rTotal
    // The mutant will revert because 1 >= _rTotal is false
    await expect(instance.tokenFromReflection(reflectionAmount)).to.not.be.reverted;
    
    // Alternative: test with a value that is exactly equal to the total supply
    // This would pass on both original and mutant
    // So we need the test with a value less than total reflection supply
    
    // Let's also test with zero which should work on original but not on mutant
    await expect(instance.tokenFromReflection(0)).to.not.be.reverted;
  });
});