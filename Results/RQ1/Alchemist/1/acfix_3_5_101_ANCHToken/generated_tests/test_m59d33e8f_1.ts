import { expect } from "chai";
import { ethers } } from "hardhat";

describe("ANCHToken mutant test - m59d33e8f", function () {
  it("should trigger reward when tAmount equals minTxnAmount", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy with a mock router address and mock USDC address
    const MockRouter = await ethers.getContractFactory("MockUniswapV2Router02");
    const mockRouter = await MockRouter.deploy();
    await mockRouter.waitForDeployment();
    
    const MockUSDC = await ethers.getContractFactory("MockERC20");
    const mockUSDC = await MockUSDC.deploy("MockUSDC", "USDC", 18);
    await mockUSDC.waitForDeployment();
    
    const Factory = await ethers.getContractFactory("ANCHToken");
    const instance = await Factory.deploy(await mockRouter.getAddress(), await mockUSDC.getAddress());
    await instance.waitForDeployment();
    
    // Get the minTxnAmount
    const minTxnAmount = await instance.minTxnAmount();
    
    // Add addr1 to allowed roles so it triggers the buy transfer reward path
    // We need to set _allowedRoles for addr1 - but there's no setter, so we need to find another way
    // Actually looking at the contract, _allowedRoles is private and there's no public setter
    // Let's use the original transfer path by setting the recipient as the allowed role
    
    // Since we can't set _allowedRoles directly, let's use the owner as sender (who is likely already allowed)
    // and make a transfer to addr1 with amount exactly equal to minTxnAmount
    // The _tokenBuyTransferReward will be called if sender has allowed role
    
    // First, let's check the contract has enough balance for rewards
    const contractBalance = await instance.balanceOf(await instance.getAddress());
    
    // Transfer tokens to owner first
    // The contract already minted all tokens to owner in constructor
    
    // Now perform transfer with exactly minTxnAmount
    const tx = await instance.connect(owner).transfer(addr1.address, minTxnAmount);
    await tx.wait();
    
    // Check that reward was applied - txReward for recipient should be > 0
    const rewardAmount = await instance.txReward(addr1.address);
    
    // In original contract, reward should be triggered when tAmount >= minTxnAmount
    // In mutant, reward is triggered only when tAmount > minTxnAmount
    // So for exact minTxnAmount, original has reward, mutant doesn't
    expect(rewardAmount).to.be.gt(0);
  });
});