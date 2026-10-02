import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort mutant test - m5771dd21", function () {
  it("should detect sha256 replacement by verifying transferFrom selector works correctly", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy a simple ERC20 token to use as the token contract
    const TokenFactory = await ethers.getContractFactory("MockERC20");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();
    const tokenAddress = await token.getAddress();
    
    // Deploy the airPort contract (no constructor args)
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const airPortAddress = await instance.getAddress();
    
    // Setup: Mint tokens to owner, approve airPort contract to spend them
    const mintAmount = ethers.parseEther("100");
    const transferAmount = ethers.parseEther("10");
    await token.mint(owner.address, mintAmount);
    await token.connect(owner).approve(airPortAddress, mintAmount);
    
    // Record balances before transfer
    const ownerBalanceBefore = await token.balanceOf(owner.address);
    const addr1BalanceBefore = await token.balanceOf(addr1.address);
    
    // Execute the transfer function via airPort
    const recipients = [addr1.address];
    const tx = await instance.connect(owner).transfer(
      owner.address,
      tokenAddress,
      recipients,
      transferAmount
    );
    await tx.wait();
    
    // Check balances after transfer
    const ownerBalanceAfter = await token.balanceOf(owner.address);
    const addr1BalanceAfter = await token.balanceOf(addr1.address);
    
    // If the selector is correct (keccak256), tokens should transfer
    // If selector is wrong (sha256), the call will fail silently or revert
    // In the original: owner loses tokens, addr1 gains tokens
    // In the mutant: no transfer occurs, balances remain unchanged
    
    // This assertion will fail on the mutant because no transfer happens
    expect(ownerBalanceAfter).to.equal(ownerBalanceBefore - transferAmount);
    expect(addr1BalanceAfter).to.equal(addr1BalanceBefore + transferAmount);
  });
});