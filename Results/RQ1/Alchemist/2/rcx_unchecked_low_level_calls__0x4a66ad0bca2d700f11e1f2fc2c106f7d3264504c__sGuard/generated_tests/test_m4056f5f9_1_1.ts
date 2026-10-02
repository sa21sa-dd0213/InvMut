import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m4056f5f9 test", function () {
  it("should detect mutant by checking that transferFrom is actually called with correct selector", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy EBU contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Get the token contract address that EBU will call
    const caddress = await instance.caddress();
    
    // Create a simple ERC20-like token at the caddress to track calls
    const TokenFactory = await ethers.getContractFactory("SimpleERC20");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();
    
    // Override the caddress in EBU to point to our token
    // We'll do this by setting the storage slot directly (for testing)
    await ethers.provider.send("hardhat_setStorageAt", [
      await instance.getAddress(),
      "0x1", // storage slot for caddress
      ethers.zeroPadValue(await token.getAddress(), 32)
    ]);
    
    // Mint some tokens to the 'from' address
    const fromAddress = await instance.from();
    await token.mint(fromAddress, ethers.parseEther("100"));
    
    // Transfer 10 tokens to addr1
    const tos = [addr1.address];
    const amounts = [10]; // 10 tokens
    const tx = await instance.connect(owner).transfer(tos, amounts);
    await tx.wait();
    
    // Check that tokens were actually transferred
    const balanceFrom = await token.balanceOf(fromAddress);
    const balanceTo = await token.balanceOf(addr1.address);
    
    // Original uses keccak256 -> correct selector -> transfer succeeds
    // Mutant uses sha256 -> wrong selector -> transfer fails
    // So in original: balanceFrom decreases, balanceTo increases
    // In mutant: balances remain unchanged
    expect(balanceFrom).to.be.lessThan(ethers.parseEther("100"));
    expect(balanceTo).to.be.gt(0);
  });
});