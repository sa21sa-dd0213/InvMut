import { expect } from "chai";
import { ethers } from "hardhat";

describe("airDrop mutant detection - exponentiation vs multiplication", function () {
  it("should detect the mutant that changes * to ** by verifying correct value computation", async function () {
    const [owner, from, to] = await ethers.getSigners();
    
    // Deploy a simple ERC20 token for testing transferFrom
    const TokenFactory = await ethers.getContractFactory("TestERC20");
    const token = await TokenFactory.deploy();
    await token.waitForDeployment();
    
    // Mint tokens to 'from' address and approve the airDrop contract to spend them
    const mintAmount = ethers.parseEther("1000");
    await token.mint(from.address, mintAmount);
    await token.connect(from).approve(owner.address, mintAmount);
    
    // Deploy airDrop contract (no constructor arguments needed)
    const AirDropFactory = await ethers.getContractFactory("airDrop");
    const airDrop = await AirDropFactory.deploy();
    await airDrop.waitForDeployment();
    
    // Transfer ownership of tokens from 'from' to 'to' via airDrop
    // v = 5, _decimals = 2 => original computes 5 * 10**2 = 500, mutant computes 5**10**2 = 5**100 (huge)
    const v = 5;
    const decimals = 2;
    const recipients = [to.address];
    
    // Get balances before
    const balanceBefore = await token.balanceOf(to.address);
    
    // Execute the transfer
    await airDrop.connect(owner).transfer(
      from.address,
      await token.getAddress(),
      recipients,
      v,
      decimals
    );
    
    // Get balance after
    const balanceAfter = await token.balanceOf(to.address);
    const received = balanceAfter - balanceBefore;
    
    // Original would send 500 tokens (5 * 100), mutant would send astronomically more
    // So if mutant is live, the balance increase will be huge and not equal to 500
    expect(received).to.equal(ethers.parseEther("500")); // 5 * 10**2 = 500 with 18 decimals
  });
});