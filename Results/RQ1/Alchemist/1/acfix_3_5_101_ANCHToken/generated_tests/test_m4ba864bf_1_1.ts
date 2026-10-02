import { expect } from "chai";
import { ethers } from "hardhat";

describe("ANCHToken mutant kill test", function () {
  it("should detect mutant m4ba864bf by performing a standard transfer between non-allowed addresses", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy with mock Uniswap router and USD token addresses
    const USDToken = await ethers.deployContract("MockERC20", ["USD", "USD", 18]);
    await USDToken.waitForDeployment();
    
    // For simplicity, we use a mock Uniswap V2 router address (deploy a mock)
    const MockRouter = await ethers.deployContract("MockUniswapV2Router");
    await MockRouter.waitForDeployment();
    
    const Factory = await ethers.getContractFactory("ANCHToken");
    const instance = await Factory.deploy(MockRouter.target, USDToken.target);
    await instance.waitForDeployment();
    
    // Get initial balance of addr1
    const initialBalance = await instance.balanceOf(addr1.address);
    
    // Transfer from owner (allowed) to addr1 to give them tokens
    const transferAmount = ethers.parseEther("100");
    await instance.connect(owner).transfer(addr1.address, transferAmount);
    
    // Now try to transfer from addr1 (non-allowed) to addr2 (non-allowed)
    const addr1BalanceBefore = await instance.balanceOf(addr1.address);
    const addr2BalanceBefore = await instance.balanceOf(addr2.address);
    
    // Attempt the transfer - should succeed in original but may fail in mutant
    const tx = instance.connect(addr1).transfer(addr2.address, ethers.parseEther("10"));
    
    // In the original contract, this transfer should work
    // In the mutant, the _getCurrentSupply function will return (0,0) for the normal case
    // causing _getRate() to revert with division by zero
    await expect(tx).to.not.be.reverted;
    
    const tx2 = await instance.connect(addr1).transfer(addr2.address, ethers.parseEther("10"));
    await tx2.wait();
    
    // Check that the balance was correctly transferred
    const addr1BalanceAfter = await instance.balanceOf(addr1.address);
    const addr2BalanceAfter = await instance.balanceOf(addr2.address);
    
    // In original: addr1 loses 10 tokens, addr2 gains 10 tokens
    // In mutant: the transfer will fail or produce incorrect balances
    expect(addr1BalanceAfter).to.equal(addr1BalanceBefore - ethers.parseEther("10"));
    expect(addr2BalanceAfter).to.equal(addr2BalanceBefore + ethers.parseEther("10"));
  });
});