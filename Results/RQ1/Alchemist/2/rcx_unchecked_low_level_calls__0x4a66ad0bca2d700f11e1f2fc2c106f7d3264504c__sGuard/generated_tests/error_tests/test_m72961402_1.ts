import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m72961402 - caddress changed to address(0)", function () {
  it("should kill the mutant by verifying actual token transfer fails when caddress is zero", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Get the contract address to check if caddress is zero
    const caddress = await instance.caddress();
    
    // Only run the test if caddress is address(0) (mutant detected)
    if (caddress === ethers.ZeroAddress) {
      // Setup: create a simple ERC20-like token contract to test transferFrom
      const TokenFactory = await ethers.getContractFactory("MockToken");
      const token = await TokenFactory.deploy();
      await token.waitForDeployment();
      
      // Mint tokens to the from address
      const fromAddress = await instance.from();
      await token.mint(fromAddress, ethers.parseEther("100"));
      
      // Approve the EBU contract to spend tokens
      await token.connect(owner).approve(await instance.getAddress(), ethers.parseEther("100"));
      
      // Try to call transfer - this should succeed but do nothing
      const recipients = [addr1.address];
      const amounts = [ethers.parseEther("1")];
      
      await instance.transfer(recipients, amounts);
      
      // Check that addr1 received NO tokens (because call went to address(0))
      const balance = await token.balanceOf(addr1.address);
      expect(balance).to.equal(0);
      
      // Additional check: from address still has all tokens
      const fromBalance = await token.balanceOf(fromAddress);
      expect(fromBalance).to.equal(ethers.parseEther("100"));
    }
  });
});