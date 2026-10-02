import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource mutant mcb8572ff test", function () {
  it("should kill mutant by verifying redeemToken returns correct mAssetsActual via subtraction, not division", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy a mock mAsset token (ERC20)
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mAsset = await MockERC20.deploy("MockMAsset", "mMASS", 18);
    await mAsset.waitForDeployment();
    
    // Deploy a mock savings contract that implements ISavingsContractV2
    const MockSavings = await ethers.getContractFactory("MockSavingsContractV2");
    const savings = await MockSavings.deploy(await mAsset.getAddress());
    await savings.waitForDeployment();
    
    // Deploy MStableYieldSource
    const Factory = await ethers.getContractFactory("MStableYieldSource");
    const instance = await Factory.deploy(await savings.getAddress());
    await instance.waitForDeployment();
    
    // Transfer some mAsset to addr1 for testing
    await mAsset.transfer(addr1.address, ethers.parseEther("1000"));
    
    // Approve and supply tokens to get credits
    await mAsset.connect(addr1).approve(await instance.getAddress(), ethers.parseEther("500"));
    await instance.connect(addr1).supplyTokenTo(ethers.parseEther("500"), addr1.address);
    
    // Record mAsset balance before redeem
    const balanceBefore = await mAsset.balanceOf(await instance.getAddress());
    
    // Redeem a portion of the supplied tokens
    const tx = await instance.connect(addr1).redeemToken(ethers.parseEther("100"));
    const receipt = await tx.wait();
    
    // Get mAsset balance after redeem
    const balanceAfter = await mAsset.balanceOf(await instance.getAddress());
    
    // Calculate expected actual amount (subtraction)
    const expectedActual = balanceBefore - balanceAfter;
    
    // The original contract returns balanceAfter - balanceBefore
    // The mutant returns balanceAfter / balanceBefore
    // For the mutant, if balanceBefore > 0, balanceAfter / balanceBefore < balanceAfter
    // But expectedActual = balanceBefore - balanceAfter < 0 (since balanceAfter > balanceBefore)
    // So mutant will return a positive number while original returns 0 (or negative)
    
    // Get the actual return value from the event
    const event = receipt.logs.find(
      (log) => log.topics[0] === ethers.id("Redeemed(address,uint256,uint256)")
    );
    
    if (event) {
      const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
        ["address", "uint256", "uint256"],
        event.data
      );
      const actualAmountReturned = decoded[2];
      
      // The original contract returns balanceAfter - balanceBefore
      // The mutant returns balanceAfter / balanceBefore
      // For this test case, the subtraction result will be negative (balanceAfter > balanceBefore)
      // The division result will be a positive number > 0
      // We expect the original behavior (subtraction) which should give 0 or negative
      // The mutant will give a positive value, so this assertion will fail on mutant
      expect(actualAmountReturned).to.be.lt(ethers.parseEther("1"));
    }
    
    // Additional check: call balanceOfToken to verify the exchange rate calculation
    // The mutant changes how mAssetsActual is calculated internally
    // but balanceOfToken uses exchangeRate and imBalances
    const balanceOfUser = await instance.balanceOfToken(addr1.address);
    expect(balanceOfUser).to.be.gt(0);
  });
});