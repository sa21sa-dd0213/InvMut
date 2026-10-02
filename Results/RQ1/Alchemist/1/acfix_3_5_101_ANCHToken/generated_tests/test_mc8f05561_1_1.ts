import { expect } from "chai";
import { ethers } from "hardhat";

describe("ANCHToken - Kill mutant mc8f05561 (missing Transfer event in _tokenSellTransferReward)", function () {
  it("should emit Transfer event from contract to sender during sell transfer with reward", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the contract with required constructor arguments
    // We need a router address and a USD token address for the constructor
    // Using a mock router and mock token for testing
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockUSD = await MockERC20.deploy();
    await mockUSD.waitForDeployment();
    
    const MockRouter = await ethers.getContractFactory("MockUniswapV2Router02");
    const mockRouter = await MockRouter.deploy();
    await mockRouter.waitForDeployment();
    
    const Factory = await ethers.getContractFactory("ANCHToken");
    const instance = await Factory.deploy(await mockRouter.getAddress(), await mockUSD.getAddress());
    await instance.waitForDeployment();
    
    // Get the uniswap pair address that was created during deployment
    const uniswapPair = await instance.uniswapV2Pair();
    
    // Set up allowed roles for testing sell transfer
    // First, make addr2 an allowed role (recipient in sell scenario)
    // We need to simulate that the pair contract is allowed (it's the recipient)
    // The contract checks _allowedRoles[sender] || _allowedRoles[recipient]
    // For sell: sender = user, recipient = uniswap pair (or any allowed address)
    
    // Transfer some tokens to addr1 to have balance
    const transferAmount = ethers.parseEther("1000");
    await instance.transfer(addr1.address, transferAmount);
    
    // Set minTxnAmount to a small value so our transfer qualifies for reward
    await instance.setMinTxnAmount(ethers.parseEther("10"));
    
    // Set reward rate to a known value (5% by default)
    // percent = 10000, rewardRate = 5, so reward = amount * 5 / 10000 = 0.05%
    
    // Now perform a transfer from addr1 to uniswap pair (simulating sell)
    // This should trigger _tokenSellTransferReward since recipient is the pair
    const sellAmount = ethers.parseEther("100");
    
    // We need to ensure the contract has enough balance to give rewards
    // Transfer some tokens to the contract address
    await instance.transfer(await instance.getAddress(), ethers.parseEther("1000"));
    
    // Execute the transfer from addr1 to uniswap pair
    const tx = await instance.connect(addr1).transfer(uniswapPair, sellAmount);
    const receipt = await tx.wait();
    
    // Calculate expected reward: amount * rewardRate / percent = 100 * 5 / 10000 = 0.05 tokens
    const rewardRate = await instance.rewardRate();
    const percent = await instance.percent();
    const expectedReward = (sellAmount * rewardRate) / percent;
    
    // Check that Transfer event was emitted from contract address to sender (addr1)
    // This is the event that was removed in the mutant
    await expect(tx)
      .to.emit(instance, "Transfer")
      .withArgs(await instance.getAddress(), addr1.address, expectedReward);
  });
});