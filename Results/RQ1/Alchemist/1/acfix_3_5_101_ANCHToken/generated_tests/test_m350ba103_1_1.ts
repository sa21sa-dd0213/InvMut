import { expect } from "chai";
import { ethers } from "hardhat";

describe("ANCHToken mutant m350ba103 - minTxnAmount initialization", function () {
  it("should detect the mutant by verifying reward is not distributed for amounts between mutant and original thresholds", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy with a mock router and USDC token for constructor
    const MockRouter = await ethers.getContractFactory("MockUniswapV2Router02");
    const mockRouter = await MockRouter.deploy();
    await mockRouter.waitForDeployment();
    
    const MockToken = await ethers.getContractFactory("MockERC20");
    const usdcToken = await MockToken.deploy();
    await usdcToken.waitForDeployment();
    
    const Factory = await ethers.getContractFactory("ANCHToken");
    const instance = await Factory.deploy(await mockRouter.getAddress(), await usdcToken.getAddress());
    await instance.waitForDeployment();
    
    // Calculate the amount that would trigger reward in mutant but not in original
    // Original: minTxnAmount = 10000 * 1e18 = 1e22
    // Mutant: minTxnAmount = 10000 + 1e18 ≈ 1e18 + 10000
    // Use an amount between the two: 2 * 10^18
    const testAmount = ethers.parseEther("2");
    
    // Get balance of contract before transfer
    const contractBalanceBefore = await instance.balanceOf(await instance.getAddress());
    
    // Transfer tokens from owner to addr1 first (owner has all tokens initially)
    await instance.transfer(addr1.address, testAmount);
    
    // Get balance of addr1
    const addr1Balance = await instance.balanceOf(addr1.address);
    
    // Now try to transfer from addr1 to addr2
    // For a normal transfer (not allowed role), it will go to the else branch
    // But we need to check if reward is given
    
    // Transfer tokens from addr1 to addr2
    await instance.connect(addr1).transfer(addr2.address, testAmount);
    
    // Check txReward for recipient - should be 0 in original, but might be >0 in mutant
    const rewardForAddr2 = await instance.txReward(addr2.address);
    
    // In the original contract, this amount (2e18) is less than minTxnAmount (1e22)
    // so no reward should be distributed
    // In the mutant, this amount (2e18) is greater than minTxnAmount (≈1e18)
    // so reward WOULD be distributed
    
    // Therefore, if reward is 0, the mutant is killed (original behavior)
    // If reward > 0, the mutant survives but our test expects 0
    expect(rewardForAddr2).to.equal(0);
  });
});