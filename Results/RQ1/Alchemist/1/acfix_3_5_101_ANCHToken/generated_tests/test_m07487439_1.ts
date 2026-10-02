import { expect } from "chai";
import { ethers } from "hardhat";

describe("ANCHToken mutant m07487439 - _tokenSellTransferReward false condition", function () {
  it("should distribute reward to seller when contract has sufficient balance, but mutant blocks it", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy with mock router and USD token
    const USDTokenFactory = await ethers.getContractFactory("ERC20Mock");
    const usdToken = await USDTokenFactory.deploy("USD", "USD", 18);
    await usdToken.waitForDeployment();
    
    // Deploy a mock Uniswap V2 router (simplified)
    const RouterFactory = await ethers.getContractFactory("UniswapV2Router02Mock");
    const router = await RouterFactory.deploy();
    await router.waitForDeployment();
    
    const ANCHTokenFactory = await ethers.getContractFactory("ANCHToken");
    const anchToken = await ANCHTokenFactory.deploy(
      await router.getAddress(),
      await usdToken.getAddress()
    );
    await anchToken.waitForDeployment();
    
    // Setup: Transfer tokens to contract for rewards
    const rewardAmount = ethers.parseEther("1000");
    await anchToken.transfer(await anchToken.getAddress(), rewardAmount);
    
    // Setup: Add addr1 to allowed roles (seller role)
    // Note: The contract doesn't have a public setAllowedRoles function, 
    // so we need to interact through the constructor or direct storage manipulation
    // For testing purposes, we'll use the owner who is already an allowed role
    
    // Perform a sell transfer: owner (allowed role) sends to addr2 (not allowed)
    const sellAmount = ethers.parseEther("20000"); // Above minTxnAmount (10000)
    
    // Get initial balances
    const initialContractBalance = await anchToken.balanceOf(await anchToken.getAddress());
    const initialSellerBalance = await anchToken.balanceOf(owner.address);
    const initialTxReward = await anchToken.txReward(owner.address);
    
    // Execute the transfer that triggers _tokenSellTransferReward
    await anchToken.transfer(addr2.address, sellAmount);
    
    // Check if reward was distributed (original behavior)
    const finalContractBalance = await anchToken.balanceOf(await anchToken.getAddress());
    const finalSellerBalance = await anchToken.balanceOf(owner.address);
    const finalTxReward = await anchToken.txReward(owner.address);
    
    // On original: reward should be distributed (contract balance decreases, seller gets tokens)
    // On mutant: reward is NOT distributed because condition is false
    
    // The test expects reward distribution (original behavior)
    expect(finalContractBalance).to.be.lessThan(initialContractBalance);
    expect(finalSellerBalance).to.be.greaterThan(initialSellerBalance);
    expect(finalTxReward).to.be.greaterThan(initialTxReward);
  });
});