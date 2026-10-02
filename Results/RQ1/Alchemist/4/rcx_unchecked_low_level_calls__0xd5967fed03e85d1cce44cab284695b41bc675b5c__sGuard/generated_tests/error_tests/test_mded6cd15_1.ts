import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant mded6cd15 test", function () {
  it("should kill mutant by verifying transferFrom is correctly called via keccak256 selector", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy a simple ERC20-like token contract that has transferFrom function
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", ethers.parseEther("1000"));
    await token.waitForDeployment();
    
    // Fund addr1 with some tokens
    await token.transfer(addr1.address, ethers.parseEther("100"));
    
    // Deploy the demo contract (no constructor arguments)
    const DemoFactory = await ethers.getContractFactory("demo");
    const demo = await DemoFactory.deploy();
    await demo.waitForDeployment();
    
    // Approve demo contract to spend tokens from addr1
    await token.connect(addr1).approve(await demo.getAddress(), ethers.parseEther("50"));
    
    // Get initial balance of addr2
    const initialBalance = await token.balanceOf(addr2.address);
    
    // Call transfer function - should call transferFrom on the token
    const recipients = [addr2.address];
    const tx = await demo.connect(owner).transfer(
      addr1.address,
      await token.getAddress(),
      recipients,
      ethers.parseEther("10")
    );
    await tx.wait();
    
    // Check that tokens were actually transferred (sha256 would produce wrong selector)
    const finalBalance = await token.balanceOf(addr2.address);
    
    // If the mutant uses sha256, the transferFrom call will fail silently
    // and addr2's balance will remain unchanged, killing the mutant
    expect(finalBalance).to.equal(initialBalance + ethers.parseEther("10"));
  });
});