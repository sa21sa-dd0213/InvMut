import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant m9eec33b2 - distributeTokenPeriodic boundary test", function () {
  it("should revert when balance exactly equals distributeAmount (mutant kills)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy DCF with a liquidity receive address
    const DCF = await ethers.getContractFactory("DCF");
    const instance = await DCF.deploy(addr1.address);
    await instance.waitForDeployment();
    
    // Set up the caller (cfo) to be able to set distribute address
    await instance.connect(owner).setCaller(owner.address);
    
    // Set distribute address
    await instance.connect(owner).setDistributeAddress(addr1.address);
    
    // Get the distribute amount (2000 * 1e18)
    const distributeAmount = ethers.parseEther("2000");
    
    // First, we need to get tokens into the contract. Transfer exactly distributeAmount to the contract
    // The owner has all initial supply, so we can transfer to contract
    await instance.connect(owner).transfer(await instance.getAddress(), distributeAmount);
    
    // Verify balance is exactly distributeAmount
    const contractBalance = await instance.balanceOf(await instance.getAddress());
    expect(contractBalance).to.equal(distributeAmount);
    
    // Call distributeTokenPeriodic - this should revert on mutant (strict >) but pass on original (>=)
    // Since the contract balance equals distributeAmount exactly
    await expect(
      instance.connect(owner).distributeTokenPeriodic()
    ).to.be.revertedWith("Insufficient token balance");
  });
});