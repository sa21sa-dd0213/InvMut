import { expect } from "chai";
import { ethers } from "hardhat";

describe("ANCHToken mutant ma3eada47 test", function () {
  it("should detect the mutant by verifying correct balance calculation after reflection supply corruption", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy with Uniswap router and USDC token addresses (using zero addresses for test)
    const RouterFactory = await ethers.getContractFactory("UniswapV2Router02Mock");
    const router = await RouterFactory.deploy();
    await router.waitForDeployment();
    
    const TokenFactory = await ethers.getContractFactory("MockERC20");
    const usdcToken = await TokenFactory.deploy("USDC", "USDC", 18);
    await usdcToken.waitForDeployment();
    
    const ANCHFactory = await ethers.getContractFactory("ANCHToken");
    const instance = await ANCHFactory.deploy(await router.getAddress(), await usdcToken.getAddress());
    await instance.waitForDeployment();
    
    // First, set up allowed roles to enable the reward transfer paths
    // We need to set addr1 as allowed role to trigger the reward mechanism
    // Since _allowedRoles is private, we'll use the transfer paths differently
    // Instead, let's manipulate the state by making transfers that affect _rTotal
    
    // Get initial balances
    const initialBalance = await instance.balanceOf(owner.address);
    
    // Perform a large transfer to addr1 that will trigger reward mechanism
    // This will reduce _rTotal when rewards are distributed
    const transferAmount = ethers.parseEther("10001"); // Above minTxnAmount
    await instance.transfer(addr1.address, transferAmount);
    
    // Now perform another transfer that should use the normal (non-reward) path
    // The reflection supply (_rTotal) has been reduced by the reward distribution
    const normalTransfer = ethers.parseEther("100");
    await instance.connect(addr1).transfer(addr2.address, normalTransfer);
    
    // Now check balanceOf for addr2 - this calls tokenFromReflection which uses _getCurrentSupply
    const addr2Balance = await instance.balanceOf(addr2.address);
    
    // The balance should be exactly 100 tokens (the normal transfer amount)
    // In the mutant, _getCurrentSupply returns corrupted values, leading to incorrect balance
    expect(addr2Balance).to.equal(normalTransfer);
    
    // Also verify that total supply remains unchanged
    const totalSupply = await instance.totalSupply();
    expect(totalSupply).to.equal(ethers.parseEther("10000000"));
  });
});