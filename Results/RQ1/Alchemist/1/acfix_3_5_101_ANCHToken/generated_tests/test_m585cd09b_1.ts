import { expect } from "chai";
import { ethers } from "hardhat";

describe("ANCHToken mutant kill test - m585cd09b", function () {
  it("should detect mutant that removes standard transfer for non-role users", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy with Uniswap router and USD token addresses
    // Using zero address as placeholder for router and USD token since we only need transfer functionality
    const Factory = await ethers.getContractFactory("ANCHToken");
    const instance = await Factory.deploy(
      "0x0000000000000000000000000000000000000000", // router address
      "0x0000000000000000000000000000000000000001"  // USD token address
    );
    await instance.waitForDeployment();

    // Transfer some tokens from owner to addr1 for testing
    const transferAmount = ethers.parseEther("100");
    await instance.transfer(addr1.address, transferAmount);

    // Record balances before non-role transfer
    const senderBalanceBefore = await instance.balanceOf(addr1.address);
    const recipientBalanceBefore = await instance.balanceOf(addr2.address);
    const sendAmount = ethers.parseEther("10");

    // Perform transfer between two non-role addresses
    const tx = await instance.connect(addr1).transfer(addr2.address, sendAmount);
    await tx.wait();

    // Check balances after transfer
    const senderBalanceAfter = await instance.balanceOf(addr1.address);
    const recipientBalanceAfter = await instance.balanceOf(addr2.address);

    // Verify the transfer actually occurred - should fail on mutant
    expect(senderBalanceAfter).to.equal(senderBalanceBefore - sendAmount);
    expect(recipientBalanceAfter).to.equal(recipientBalanceBefore + sendAmount);
  });
});