import { expect } from "chai";
import { ethers } from "hardhat";

describe("ANCHToken mutant kill test - tokenFromReflection boundary", function () {
  it("should revert when rAmount equals _rTotal in mutant but pass in original", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy with mock router and USD token addresses
    // Note: We need valid addresses for constructor, using dummy addresses
    const mockRouter = "0x0000000000000000000000000000000000000001";
    const mockUSDToken = "0x0000000000000000000000000000000000000002";
    
    const Factory = await ethers.getContractFactory("ANCHToken");
    const instance = await Factory.deploy(mockRouter, mockUSDToken);
    await instance.waitForDeployment();

    // Get the _rTotal value by calling tokenFromReflection with the MAX value
    // The MAX constant is ~uint256(0) = 2^256 - 1
    // _rTotal = MAX - (MAX % _tTotal)
    // We can compute it: _rTotal should be a multiple of _tTotal
    const totalSupply = await instance.totalSupply();
    const maxUint = ethers.MaxUint256;
    const rTotal = maxUint - (maxUint % totalSupply);
    
    // Now call tokenFromReflection with rAmount = _rTotal (exactly equal)
    // Original: should pass (<=)
    // Mutant: should revert (<)
    await expect(
      instance.tokenFromReflection(rTotal)
    ).to.not.be.reverted;
    
    // Also verify that calling with rAmount = _rTotal + 1 reverts
    // This ensures the function properly validates upper bounds
    await expect(
      instance.tokenFromReflection(rTotal + 1n)
    ).to.be.revertedWith("Amount must be less than total reflections");
  });
});