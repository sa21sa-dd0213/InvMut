import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant m814e6338 - loop condition change", function () {
  it("should detect mutant by verifying loop execution with multiple recipients", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple token contract that implements transferFrom
    const TokenFactory = await ethers.getContractFactory("SimpleToken");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Mint tokens to addr1 so transferFrom can succeed
    await token.mint(addr1.address, ethers.parseEther("100"));
    
    // Approve the demo contract to spend tokens from addr1
    await token.connect(addr1).approve(await instance.getAddress(), ethers.parseEther("100"));

    // Create an array of recipients (more than one to ensure loop matters)
    const recipients = [owner.address, addr2.address];
    const amount = ethers.parseEther("10");

    // Call transfer on the demo contract with valid parameters
    const tx = await instance.transfer(
      addr1.address,
      await token.getAddress(),
      recipients,
      amount
    );
    const receipt = await tx.wait();

    // Check that the token transfer actually occurred for both recipients
    // If the loop didn't execute (mutant), only the first transfer would happen or none
    const balanceOwner = await token.balanceOf(owner.address);
    const balanceAddr2 = await token.balanceOf(addr2.address);
    
    expect(balanceOwner).to.equal(ethers.parseEther("10"));
    expect(balanceAddr2).to.equal(ethers.parseEther("10"));

    // Also verify the sender's balance decreased appropriately
    const balanceAddr1 = await token.balanceOf(addr1.address);
    expect(balanceAddr1).to.equal(ethers.parseEther("80"));
  });
});