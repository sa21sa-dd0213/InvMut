import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant detection test", function () {
  it("should detect mutant m8795475e by verifying token transfer to recipient", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the EBU contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Get the from address from the contract
    const fromAddress = await instance.from();
    
    // Create a simple token contract that can receive transferFrom calls
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();
    
    // Mint tokens to the from address
    const mintAmount = ethers.parseEther("1000");
    await token.mint(fromAddress, mintAmount);
    
    // Approve the caddress (which should be the token contract in original)
    // But in mutant it points to fromAddress itself
    const caddress = await instance.caddress();
    await token.connect(owner).approve(caddress, ethers.MaxUint256);
    
    // Prepare transfer parameters
    const recipients = [addr1.address];
    const amounts = [1]; // 1 ETH worth of tokens
    
    // Execute the transfer
    const tx = await instance.connect(owner).transfer(recipients, amounts);
    await tx.wait();
    
    // Check recipient balance - in original, tokens would be transferred
    // In mutant, call goes to fromAddress (EOA) so no transfer happens
    const recipientBalance = await token.balanceOf(addr1.address);
    
    // If mutant is active, recipient will have 0 tokens
    // If original, recipient will have 1000000000000000000 tokens (1 * 10^18)
    expect(recipientBalance).to.equal(ethers.parseEther("1"));
  });
});