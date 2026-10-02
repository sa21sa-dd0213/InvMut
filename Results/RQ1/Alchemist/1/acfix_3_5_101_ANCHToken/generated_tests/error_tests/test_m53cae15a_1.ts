import { expect } from "chai";
import { ethers } from "hardhat";

describe("ANCHToken mutant m53cae15a test", function () {
  it("should kill mutant where >= is replaced with == in _tokenSellTransferReward", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy a mock WETH and a mock USD token for the Uniswap pair
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const usdToken = await MockERC20.deploy("USD", "USD", 18);
    await usdToken.waitForDeployment();
    
    // Deploy a mock router that returns a factory address
    const MockFactory = await ethers.getContractFactory("MockUniswapV2Factory");
    const mockFactory = await MockFactory.deploy();
    await mockFactory.waitForDeployment();
    
    const MockRouter = await ethers.getContractFactory("MockUniswapV2Router02");
    const mockRouter = await MockRouter.deploy(mockFactory.target);
    await mockRouter.waitForDeployment();
    
    // Deploy the ANCHToken
    const ANCHToken = await ethers.getContractFactory("ANCHToken");
    const token = await ANCHToken.deploy(mockRouter.target, usdToken.target);
    await token.waitForDeployment();
    
    // Get the deployed pair address from the factory
    const pairAddress = await mockFactory.getPair(token.target, usdToken.target);
    
    // Set up the allowed roles for testing
    // We need to grant _allowedRoles to addr1 and addr2 to trigger the reward paths
    // Since _allowedRoles is private, we need to set it via the constructor or add a public setter
    // For testing, we'll simulate the sell scenario by directly manipulating state
    // Actually, let's use the public changeUniswapV2Pair to set the pair
    await token.changeUniswapV2Pair(pairAddress);
    
    // Transfer tokens to addr1 to have balance for selling
    const transferAmount = ethers.parseEther("1000");
    await token.transfer(addr1.address, transferAmount);
    
    // Set minTxnAmount to a small value so our test transaction triggers reward
    await token.setMinTxnAmount(ethers.parseEther("1"));
    
    // Set rewardRate to 5 (5% reward)
    await token.setRewardRate(5);
    
    // Transfer tokens to the contract itself to have balance for rewards
    // The contract needs to have tokens to pay rewards
    const contractFundingAmount = ethers.parseEther("100");
    await token.transfer(token.target, contractFundingAmount);
    
    // Now perform a sell transaction from addr1 to the pair (simulating a sell)
    // The sell path goes through _tokenSellTransferReward when recipient is the pair
    
    // First, let's check the contract's balance before the transaction
    const contractBalanceBefore = await token.balanceOf(token.target);
    
    // Calculate expected reward: tAmount * rewardRate / percent
    // percent is 10000, rewardRate is 5, so reward = tAmount * 5 / 10000 = tAmount * 0.0005
    const sellAmount = ethers.parseEther("10");
    const expectedReward = sellAmount * 5n / 10000n; // 0.005 tokens
    
    // The contract has 100 tokens, which is greater than expectedReward (0.005)
    // In original: balanceOf(this) >= rewardAmount → true (100 >= 0.005)
    // In mutant: balanceOf(this) == rewardAmount → false (100 != 0.005)
    
    // Execute the sell transaction from addr1 to the pair address
    await expect(token.connect(addr1).transfer(pairAddress, sellAmount)).to.emit(token, "Transfer");
    
    // Check if the reward was paid to addr1 (sender)
    // In original, reward should be paid → txReward[addr1] should increase
    // In mutant, reward should NOT be paid → txReward[addr1] should remain 0
    
    const txRewardAddr1 = await token.txReward(addr1.address);
    
    // The mutant will fail this assertion because it won't pay the reward
    // when balanceOf(this) > rewardAmount (which is the case here)
    expect(txRewardAddr1).to.equal(expectedReward);
  });
});