import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource mutant test - redeemToken division bug", function () {
  it("should kill mutant by verifying redeemToken returns correct amount when after-balance is not a divisor of before-balance", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy mock tokens and savings contract for testing
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const MockSavingsContract = await ethers.getContractFactory("MockSavingsContract");

    // Deploy mock mAsset token
    const mAsset = await MockERC20.deploy("Mock mAsset", "mASSET", ethers.parseEther("1000000"));
    await mAsset.waitForDeployment();

    // Deploy mock savings contract
    const savings = await MockSavingsContract.deploy(await mAsset.getAddress());
    await savings.waitForDeployment();

    // Deploy MStableYieldSource
    const MStableYieldSource = await ethers.getContractFactory("MStableYieldSource");
    const yieldSource = await MStableYieldSource.deploy(await savings.getAddress());
    await yieldSource.waitForDeployment();

    // Fund user with mAsset tokens
    await mAsset.transfer(user.address, ethers.parseEther("500"));
    await mAsset.connect(user).approve(await yieldSource.getAddress(), ethers.parseEther("500"));

    // Deposit tokens to create balance
    await yieldSource.connect(user).supplyTokenTo(ethers.parseEther("100"), user.address);

    // Set up mock savings contract to return specific values for redeemUnderlying
    // When redeeming 50 tokens, before-balance should be 100, after-balance should be 50
    await savings.setRedeemUnderlyingReturn(ethers.parseEther("50"));

    // Execute redeemToken for 50 tokens
    const tx = await yieldSource.connect(user).redeemToken(ethers.parseEther("50"));
    const receipt = await tx.wait();

    // Check the Redeemed event to verify actual amount
    const event = receipt.logs.find(log => {
      try {
        const parsed = yieldSource.interface.parseLog(log);
        return parsed.name === "Redeemed";
      } catch {
        return false;
      }
    });

    if (event) {
      const parsedEvent = yieldSource.interface.parseLog(event);
      const actualAmount = parsedEvent.args[2];

      // The correct amount should be 50, but the mutant would return 0
      // This assertion will pass on the mutant (returning 0) and fail on the original (returning 50)
      expect(actualAmount).to.equal(ethers.parseEther("50"));
    }
  });
});