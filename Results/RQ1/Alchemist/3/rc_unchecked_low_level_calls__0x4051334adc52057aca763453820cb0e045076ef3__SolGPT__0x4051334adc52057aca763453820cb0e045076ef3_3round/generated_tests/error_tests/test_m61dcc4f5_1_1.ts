import { expect } from "chai";
import { ethers } from "hardhat";

describe("airdrop reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m61dcc4f5 by verifying correct transferFrom selector is used", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the airdrop contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("airdrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a simple ERC20-like token for testing
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Test Token", "TST", ethers.parseEther("1000"));
    await token.waitForDeployment();
    
    // Fund addr1 with tokens and approve airdrop contract to spend them
    await token.transfer(addr1.address, ethers.parseEther("100"));
    await token.connect(addr1).approve(await instance.getAddress(), ethers.parseEther("10"));
    
    // Get initial balances
    const initialBalanceAddr2 = await token.balanceOf(addr2.address);
    
    // Execute the transfer through airdrop - this should call transferFrom on the token
    const recipients = [addr2.address];
    const tx = await instance.connect(owner).transfer(
      addr1.address,
      await token.getAddress(),
      recipients,
      ethers.parseEther("5")
    );
    await tx.wait();
    
    // Verify the transfer was successful - addr2 received tokens
    const finalBalanceAddr2 = await token.balanceOf(addr2.address);
    expect(finalBalanceAddr2).to.equal(initialBalanceAddr2 + ethers.parseEther("5"));
    
    // This test will pass on the correct contract because keccak256 produces the correct selector
    // causing the transferFrom call to succeed
  });
});