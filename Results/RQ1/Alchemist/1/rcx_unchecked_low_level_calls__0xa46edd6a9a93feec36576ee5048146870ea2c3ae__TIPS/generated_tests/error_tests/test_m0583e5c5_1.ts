import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m0583e5c5 test", function () {
  it("should kill the mutant by verifying correct function selector is used", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the EBU contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a simple ERC20-like contract to receive the transferFrom call
    const TokenFactory = await ethers.getContractFactory("SimpleERC20");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();
    
    // Mint some tokens to owner and approve EBU contract to spend them
    const mintAmount = ethers.parseEther("100");
    await token.mint(owner.address, mintAmount);
    await token.approve(instance.target, mintAmount);
    
    // Prepare transfer parameters: from=owner, caddress=token, tos=[addr1], v=[50]
    const tos = [addr1.address];
    const values = [ethers.parseEther("50")];
    
    // Call the transfer function
    const tx = await instance.transfer(owner.address, token.target, tos, values);
    await tx.wait();
    
    // Verify that the transfer actually happened (mutant would have failed)
    const balance1 = await token.balanceOf(addr1.address);
    expect(balance1).to.equal(ethers.parseEther("50"));
    
    const balanceOwner = await token.balanceOf(owner.address);
    expect(balanceOwner).to.equal(ethers.parseEther("50"));
  });
});

// Helper contract to simulate ERC20 behavior for testing
// Note: In a real test, you would deploy an actual ERC20 contract
// This is provided for completeness - the actual test assumes SimpleERC20 exists