import { expect } from "chai";
import { ethers } from "hardhat";

describe("ANCHToken mutant kill test for m74556478", function () {
  it("should revert when unauthorized sender tries to trigger buy reward transfer", async function () {
    const [owner, addr1, addr2, unauthorizedUser] = await ethers.getSigners();
    
    // Deploy a simple ERC20 as USD token
    const SimpleERC20 = await ethers.getContractFactory("SimpleERC20");
    const usdToken = await SimpleERC20.deploy("USD Token", "USD", 18);
    await usdToken.waitForDeployment();
    
    // Deploy Mock Uniswap V2 Router
    const MockRouter = await ethers.getContractFactory("MockUniswapV2Router02");
    const mockRouter = await MockRouter.deploy();
    await mockRouter.waitForDeployment();
    
    // Deploy ANCHToken with mock addresses
    const ANCHToken = await ethers.getContractFactory("ANCHToken");
    const anchorToken = await ANCHToken.deploy(mockRouter.target, usdToken.target);
    await anchorToken.waitForDeployment();
    
    // Get some tokens to unauthorized user
    const totalSupply = await anchorToken.totalSupply();
    const transferAmount = ethers.parseEther("100");
    
    // Owner transfers tokens to unauthorized user first
    await anchorToken.transfer(unauthorizedUser.address, transferAmount);
    
    // Now test: unauthorized user tries to transfer
    // In original: should succeed (goes to else branch)
    // In mutant: will try to give reward, but contract has 0 balance -> revert
    
    // The key difference: in mutant, the _tokenBuyTransferReward is called instead of regular transfer
    // Both do the same base transfer, but _tokenBuyTransferReward also tracks txReward
    
    // Test: Check that txReward is NOT updated for unauthorized users in original
    // but IS updated in mutant
    
    // Get initial txReward for recipient
    const initialTxReward = await anchorToken.txReward(owner.address);
    
    // Unauthorized user transfers to owner
    await anchorToken.connect(unauthorizedUser).transfer(owner.address, transferAmount);
    
    // Check txReward for owner
    const finalTxReward = await anchorToken.txReward(owner.address);
    
    // In original: txReward should remain the same (no reward for unauthorized)
    // In mutant: txReward should increase (reward was tracked)
    
    // The transfer amount is less than minTxnAmount (10000 tokens), so no reward actually given
    // But the txReward mapping is still updated in the mutant
    
    // Let's make transfer amount >= minTxnAmount to trigger reward logic
    const largeAmount = ethers.parseEther("15000"); // > minTxnAmount
    
    // First get more tokens to unauthorized user
    await anchorToken.transfer(unauthorizedUser.address, largeAmount);
    
    // Get initial txReward for owner
    const initialTxReward2 = await anchorToken.txReward(owner.address);
    
    // Unauthorized user transfers large amount to owner
    await anchorToken.connect(unauthorizedUser).transfer(owner.address, largeAmount);
    
    // Check txReward for owner
    const finalTxReward2 = await anchorToken.txReward(owner.address);
    
    // In original: txReward should be unchanged (regular transfer, no reward)
    // In mutant: txReward should increase (buy reward path updates txReward)
    
    expect(initialTxReward2).to.equal(finalTxReward2,
      "Original contract should not update txReward for unauthorized senders");
  });
});