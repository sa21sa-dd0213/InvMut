import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource mutant kill test - redeemToken division bug", function () {
  it("should kill mutant mcb8572ff by verifying that redeemToken returns the correct mAsset amount via subtraction, not division", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy a mock mAsset token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mAsset = await MockERC20.deploy("Mock MAsset", "mMASS", 18);
    await mAsset.waitForDeployment();
    
    // Deploy a mock savings contract
    const MockSavingsContractV2 = await ethers.getContractFactory("MockSavingsContractV2");
    const savings = await MockSavingsContractV2.deploy(await mAsset.getAddress());
    await savings.waitForDeployment();
    
    // Deploy MStableYieldSource
    const Factory = await ethers.getContractFactory("MStableYieldSource");
    const instance = await Factory.deploy(await savings.getAddress());
    await instance.waitForDeployment();
    
    // Transfer some mAsset tokens to addr1 for testing
    const depositAmount = ethers.parseEther("100");
    await mAsset.mint(addr1.address, depositAmount);
    await mAsset.connect(addr1).approve(await instance.getAddress(), depositAmount);
    
    // First supply tokens to get some balance
    const supplyAmount = ethers.parseEther("50");
    await instance.connect(addr1).supplyTokenTo(supplyAmount, addr1.address);
    
    // Now test redeemToken - we need to check that the returned amount is the difference, not a division result
    // If the mutant uses division, the result will be mAssetBalanceAfter / mAssetBalanceBefore
    // For example, if before=50 and after=100 (after redeeming 50), original returns 50, mutant returns 2
    
    const redeemAmount = ethers.parseEther("10");
    
    // Get balance before redeem
    const balanceBefore = await mAsset.balanceOf(await instance.getAddress());
    
    // Perform redeem
    const tx = await instance.connect(addr1).redeemToken(redeemAmount);
    const receipt = await tx.wait();
    
    // Get balance after redeem
    const balanceAfter = await mAsset.balanceOf(await instance.getAddress());
    
    // The actual amount returned should be balanceAfter - balanceBefore
    const expectedActualAmount = balanceAfter - balanceBefore;
    
    // Parse the event to get the actual amount returned
    const event = receipt.logs.find((log: any) => {
      try {
        return instance.interface.parseLog({
          topics: [...log.topics],
          data: log.data
        })?.name === "Redeemed";
      } catch {
        return false;
      }
    });
    
    if (event) {
      const parsedEvent = instance.interface.parseLog({
        topics: [...event.topics],
        data: event.data
      });
      const actualAmount = parsedEvent?.args?.actualAmount;
      
      // If the mutant is present, actualAmount will be balanceAfter / balanceBefore (e.g., 100/50 = 2)
      // Instead of balanceAfter - balanceBefore (e.g., 100-50 = 50)
      expect(actualAmount).to.equal(expectedActualAmount);
    }
    
    // Also verify that the transfer to user matches the expected actual amount
    const userBalance = await mAsset.balanceOf(addr1.address);
    // The user should have received exactly the difference, not a division result
    expect(userBalance).to.equal(depositAmount - supplyAmount + expectedActualAmount);
  });
});