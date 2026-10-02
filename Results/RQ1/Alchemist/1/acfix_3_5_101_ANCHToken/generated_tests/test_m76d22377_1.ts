import { expect } from "chai";
import { ethers } } from "hardhat";

describe("ANCHToken mutant m76d22377 test", function () {
  it("should detect the >= to == mutation in _tokenBuyTransferReward", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy mock USD token for pair creation
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const usdToken = await MockERC20.deploy("USD", "USD", 18);
    await usdToken.waitForDeployment();
    
    // Deploy Uniswap V2 Router mock (simplified for testing)
    const UniswapV2Router02 = await ethers.getContractFactory("UniswapV2Router02Mock");
    const router = await UniswapV2Router02.deploy();
    await router.waitForDeployment();
    
    // Deploy ANCHToken with router and USD token addresses
    const ANCHToken = await ethers.getContractFactory("ANCHToken");
    const anchToken = await ANCHToken.deploy(router.target, usdToken.target);
    await anchToken.waitForDeployment();
    
    // Set minTxnAmount low enough for testing (1 token)
    await anchToken.connect(owner).setMinTxnAmount(ethers.parseEther("1"));
    
    // Get the uniswapV2Pair address from the contract
    const pairAddress = await anchToken.uniswapV2Pair();
    
    // Grant _allowedRoles to addr1 (buyer) and pair (recipient) to trigger _tokenBuyTransferReward
    // We need to simulate the transfer from allowed role to trigger the buy reward path
    // First, transfer some tokens to addr1
    const totalSupply = await anchToken.totalSupply();
    await anchToken.connect(owner).transfer(addr1.address, ethers.parseEther("1000"));
    
    // Add tokens to the contract itself to have a balance > 0
    await anchToken.connect(owner).transfer(anchToken.target, ethers.parseEther("500"));
    
    // Get contract balance before the test
    const contractBalanceBefore = await anchToken.balanceOf(anchToken.target);
    
    // Now perform a transfer from addr1 to pair address (simulating a buy)
    // This will trigger _tokenBuyTransferReward since sender (addr1) has _allowedRoles
    // For the mutant to be killed, we need balanceOf(address(this)) > rewardAmount
    // rewardAmount = tAmount * rewardRate / percent = 100 * 5 / 10000 = 0.05 tokens
    const transferAmount = ethers.parseEther("100");
    const expectedReward = transferAmount * 5n / 10000n; // 0.05 tokens
    
    // Ensure contract balance is greater than reward amount
    expect(contractBalanceBefore).to.be.gt(expectedReward);
    
    // Execute the transfer that should trigger reward logic
    await anchToken.connect(addr1).transfer(pairAddress, transferAmount);
    
    // Check if reward was applied (original behavior)
    // In the original, reward should be added to recipient (pairAddress)
    // In the mutant (==), reward would NOT be added since balance > rewardAmount
    const pairReward = await anchToken.txReward(pairAddress);
    
    // If the mutant is present, pairReward will be 0 because the condition balanceOf(this) == rewardAmount failed
    // If the original is present, pairReward will be > 0
    expect(pairReward).to.be.gt(0);
  });
});