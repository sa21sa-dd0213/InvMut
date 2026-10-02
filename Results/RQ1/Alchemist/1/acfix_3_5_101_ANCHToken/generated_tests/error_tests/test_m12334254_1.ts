import { expect } from "chai";
import { ethers } from "hardhat";

describe("ANCHToken mutant kill test for m12334254", function () {
  it("should kill mutant that changed >= to > in _tokenBuyTransferReward", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy with required constructor arguments
    // We need a mock router and USDC address for deployment
    const RouterFactory = await ethers.getContractFactory("UniswapV2Router02Mock");
    const router = await RouterFactory.deploy();
    await router.waitForDeployment();
    
    const USDC = await ethers.getContractFactory("ERC20Mock");
    const usdc = await USDC.deploy();
    await usdc.waitForDeployment();
    
    const Factory = await ethers.getContractFactory("ANCHToken");
    const instance = await Factory.deploy(await router.getAddress(), await usdc.getAddress());
    await instance.waitForDeployment();
    
    // Setup: Grant allowed role to owner so we can trigger _tokenBuyTransferReward
    // We need to find a way to set _allowedRoles - the contract doesn't have a public setter
    // So we'll use the contract's own logic - transfer to uniswapV2Pair triggers buy transfer
    const pairAddress = await instance.uniswapV2Pair();
    
    // Transfer some tokens to addr1 first
    const transferAmount = ethers.parseEther("1000");
    await instance.transfer(addr1.address, transferAmount);
    
    // Set minTxnAmount low enough for our test
    const minAmount = ethers.parseEther("10");
    await instance.setMinTxnAmount(minAmount);
    
    // Calculate reward amount: tAmount * rewardRate / percent
    // With rewardRate=5, percent=10000, and tAmount=1000, reward = 0.5 tokens
    const rewardRate = await instance.rewardRate();
    const percent = await instance.percent();
    const rewardAmount = transferAmount.mul(rewardRate).div(percent);
    
    // Transfer tokens to the contract itself to set up exact balance
    await instance.transfer(await instance.getAddress(), rewardAmount);
    
    // Now the contract balance equals exactly the reward amount
    const contractBalance = await instance.balanceOf(await instance.getAddress());
    expect(contractBalance).to.equal(rewardAmount);
    
    // Execute transfer from pair address (simulating buy) to trigger _tokenBuyTransferReward
    // Transfer from pair to addr1 with amount >= minTxnAmount
    const buyAmount = ethers.parseEther("10");
    await instance.connect(addr1).transfer(pairAddress, buyAmount);
    
    // After the transfer, the reward should have been distributed because balance >= rewardAmount
    // In original: reward is sent to recipient (addr1)
    // In mutant: reward is NOT sent because balance > rewardAmount is false (they're equal)
    
    // Check that addr1's txReward was updated (should be > 0 in original, 0 in mutant)
    const txReward = await instance.txReward(addr1.address);
    
    // In the original contract, the reward would be distributed (txReward > 0)
    // In the mutant, the reward would NOT be distributed (txReward = 0)
    // This test will pass on original and fail on mutant, thus killing it
    expect(txReward).to.be.gt(0);
  });
});