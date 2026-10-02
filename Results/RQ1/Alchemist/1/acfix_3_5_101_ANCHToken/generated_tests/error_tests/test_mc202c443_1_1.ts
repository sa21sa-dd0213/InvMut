import { expect } from "chai";
import { ethers } from "hardhat";

describe("ANCHToken mutant mc202c443", function () {
  it("should detect mutant that changes >= to == in _tokenSellTransferReward", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy with mock addresses for Uniswap router and USD token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const usdToken = await MockERC20.deploy();
    await usdToken.waitForDeployment();
    
    const MockRouter = await ethers.getContractFactory("MockUniswapV2Router02");
    const mockRouter = await MockRouter.deploy();
    await mockRouter.waitForDeployment();
    
    const ANCHToken = await ethers.getContractFactory("ANCHToken");
    const token = await ANCHToken.deploy(
      await mockRouter.getAddress(),
      await usdToken.getAddress()
    );
    await token.waitForDeployment();
    
    // Get the initial balance of the owner
    const initialBalance = await token.balanceOf(owner.address);
    
    // Set minTxnAmount to a known value
    const minTxnAmount = ethers.parseEther("10000");
    await token.setMinTxnAmount(minTxnAmount);
    
    // Enable addr1 as an allowed role for selling (recipient will trigger _tokenSellTransferReward)
    // We need to directly set the _allowedRoles mapping - this is internal so we'll use the
    // uniswapV2Pair address which is set during deployment
    const uniswapV2Pair = await token.uniswapV2Pair();
    
    // Transfer tokens to addr1 first
    const transferAmount = ethers.parseEther("1000");
    await token.transfer(addr1.address, transferAmount);
    
    // Now transfer an amount GREATER than minTxnAmount from addr1 to uniswapV2Pair
    // This should trigger the reward in original but NOT in mutant
    const amountGreaterThanMin = minTxnAmount + ethers.parseEther("1");
    
    // Ensure addr1 has enough tokens
    const addr1Balance = await token.balanceOf(addr1.address);
    await token.connect(addr1).transfer(uniswapV2Pair, amountGreaterThanMin);
    
    // In the original contract, the reward would be given to sender (addr1)
    // In the mutant, since tAmount > minTxnAmount (not equal), the reward is NOT given
    const txRewardAfter = await token.txReward(addr1.address);
    
    // The mutant would have 0 reward since the condition tAmount == minTxnAmount is false
    // The original would have some reward since tAmount >= minTxnAmount is true
    expect(txRewardAfter).to.be.gt(0);
  });
});