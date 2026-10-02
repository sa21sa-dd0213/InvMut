import { expect } from "chai";
import { ethers } from "hardhat";

describe("airdrop mutant m8bd0577c detection test", function () {
  it("should detect the mutant where < is replaced with > in the loop condition", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy a mock token that implements transferFrom
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Mock", "MCK", ethers.parseEther("1000"));
    await token.waitForDeployment();
    
    // Deploy the airdrop contract (no constructor arguments needed)
    const AirdropFactory = await ethers.getContractFactory("airdrop");
    const airdrop = await AirdropFactory.deploy();
    await airdrop.waitForDeployment();
    
    // Fund owner with tokens and approve airdrop contract to spend them
    await token.approve(await airdrop.getAddress(), ethers.parseEther("100"));
    
    // Create array of recipients
    const recipients = [await addr1.getAddress(), await addr2.getAddress()];
    const amount = ethers.parseEther("10");
    
    // Record balances before
    const balance1Before = await token.balanceOf(await addr1.getAddress());
    const balance2Before = await token.balanceOf(await addr2.getAddress());
    
    // Call transfer on airdrop
    const tx = await airdrop.transfer(
      await owner.getAddress(),
      await token.getAddress(),
      recipients,
      amount
    );
    await tx.wait();
    
    // Check balances after - in the original, both recipients should have received tokens
    const balance1After = await token.balanceOf(await addr1.getAddress());
    const balance2After = await token.balanceOf(await addr2.getAddress());
    
    // In the mutant (i > _tos.length), loop never executes, so balances remain unchanged
    // This assertion will pass on original but fail on mutant
    expect(balance1After).to.equal(balance1Before + amount);
    expect(balance2After).to.equal(balance2Before + amount);
  });
});