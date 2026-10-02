import { expect } from "chai";
import { ethers } } from "hardhat";

describe("MStableYieldSource - redeemToken mutant kill test", function () {
  it("should correctly calculate actual mAssets as difference, not sum", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy a mock underlying token (ERC20)
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const underlyingToken = await MockERC20.deploy("Underlying", "UND", 18);
    await underlyingToken.waitForDeployment();
    
    // Deploy a mock savings contract that implements ISavingsContractV2
    const MockSavings = await ethers.getContractFactory("MockSavingsV2");
    const savings = await MockSavings.deploy(await underlyingToken.getAddress());
    await savings.waitForDeployment();
    
    // Deploy MStableYieldSource
    const MStableYieldSource = await ethers.getContractFactory("MStableYieldSource");
    const yieldSource = await MStableYieldSource.deploy(await savings.getAddress());
    await yieldSource.waitForDeployment();
    
    // Mint some underlying tokens to user and approve yield source
    const depositAmount = ethers.parseEther("100");
    await underlyingToken.mint(user.address, depositAmount);
    await underlyingToken.connect(user).approve(await yieldSource.getAddress(), depositAmount);
    
    // User supplies tokens to yield source
    await yieldSource.connect(user).supplyTokenTo(depositAmount, user.address);
    
    // Record balances before redemption
    const balanceBefore = await underlyingToken.balanceOf(await yieldSource.getAddress());
    
    // Redeem tokens
    const redeemAmount = ethers.parseEther("50");
    const tx = await yieldSource.connect(user).redeemToken(redeemAmount);
    const receipt = await tx.wait();
    
    // Get the actual amount returned from the event
    const event = receipt.logs.find(log => {
      try {
        return yieldSource.interface.parseLog(log).name === "Redeemed";
      } catch (e) {
        return false;
      }
    });
    const parsedEvent = yieldSource.interface.parseLog(event);
    const actualAmount = parsedEvent.args.actualAmount;
    
    // Get balance after redemption
    const balanceAfter = await underlyingToken.balanceOf(await yieldSource.getAddress());
    
    // Calculate the correct difference
    const expectedDifference = balanceAfter - balanceBefore;
    
    // The actual amount should equal the difference, not the sum
    expect(actualAmount).to.equal(expectedDifference);
    
    // The sum would be much larger and incorrect - verify it's NOT the sum
    const sumValue = balanceAfter + balanceBefore;
    expect(actualAmount).to.not.equal(sumValue);
  });
});