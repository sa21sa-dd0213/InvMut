import { expect } from "chai";
import { ethers } from "hardhat";

describe("ANCHToken mutant kill test - maffbcd27", function () {
  it("should kill mutant by verifying reward is distributed when contract has sufficient balance", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy mock router and USD token for constructor
    const MockRouterFactory = await ethers.getContractFactory("MockUniswapV2Router02");
    const mockRouter = await MockRouterFactory.deploy();
    await mockRouter.waitForDeployment();
    
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    const usdToken = await MockERC20Factory.deploy("USD", "USD", 18);
    await usdToken.waitForDeployment();
    
    // Deploy ANCHToken with required constructor arguments
    const ANCHTokenFactory = await ethers.getContractFactory("ANCHToken");
    const instance = await ANCHTokenFactory.deploy(
      await mockRouter.getAddress(),
      await usdToken.getAddress()
    );
    await instance.waitForDeployment();
    
    // Get the uniswapV2Pair address to use as allowed role
    const uniswapV2Pair = await instance.uniswapV2Pair();
    
    // Set minimum transaction amount to a low value to trigger reward
    await instance.connect(owner).setMinTxnAmount(ethers.parseEther("1"));
    
    // Transfer tokens to contract to ensure it has balance for rewards
    const initialContractBalance = ethers.parseEther("1000");
    await instance.connect(owner).transfer(
      await instance.getAddress(),
      initialContractBalance
    );
    
    // Verify contract has sufficient balance
    const contractBalance = await instance.balanceOf(await instance.getAddress());
    expect(contractBalance).to.be.gte(ethers.parseEther("100"));
    
    // Get addr1's balance before transfer
    const balanceBefore = await instance.balanceOf(addr1.address);
    
    // Transfer from allowed role (uniswapV2Pair as sender) to addr1
    // Amount must be >= minTxnAmount to trigger reward
    const transferAmount = ethers.parseEther("10");
    await instance.connect(owner).transfer(uniswapV2Pair, transferAmount);
    
    // Now transfer from uniswapV2Pair to addr1 to trigger _tokenBuyTransferReward
    await instance.connect(addr2).transfer(uniswapV2Pair, ethers.parseEther("1"));
    await instance.connect(addr2).transfer(addr1.address, ethers.parseEther("1"));
    
    // Perform the actual transfer from allowed role to trigger reward
    // Transfer from uniswapV2Pair to addr1 (buy scenario)
    await instance.connect(owner).transfer(uniswapV2Pair, ethers.parseEther("10"));
    
    // Calculate expected reward: tAmount * rewardRate / percent = 10 * 5 / 10000 = 0.005 tokens
    const rewardAmount = ethers.parseEther("0.005");
    const expectedBalanceAfter = balanceBefore + transferAmount + rewardAmount;
    
    // Get balance after
    const balanceAfter = await instance.balanceOf(addr1.address);
    
    // If mutant is present (false condition), reward won't be added
    // Original would add reward, mutant would not
    expect(balanceAfter).to.equal(expectedBalanceAfter);
  });
});