import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant test - m060f4048", function () {
  it("should kill the mutant by verifying correct multiplication behavior with v[i] = 2", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const fromAddress = await instance.from();
    const caddress = await instance.caddress();

    // Use a recipient address (can be any address, including the contract itself for testing)
    const recipient = "0x0000000000000000000000000000000000000001";
    const _tos = [recipient];
    const v = [2]; // v[i] = 2

    // Calculate expected amount: 2 * 10^18 = 2 ether
    const expectedAmount = ethers.parseEther("2");

    // We need to check the call that the contract makes internally
    // Since we can't directly intercept internal calls, we can check that:
    // 1. The transaction succeeds (original behavior)
    // 2. The balance of the recipient changes by exactly 2 ether (if caddress is a token contract)
    // For a general test, we'll check that the transaction does NOT revert
    // The mutant with ** would cause an overflow or different behavior for v[i] > 1
    
    // Get balances before
    const balanceBefore = await ethers.provider.getBalance(recipient);
    
    // Execute the transfer function (only owner can call)
    const tx = await instance.connect(owner).transfer(_tos, v);
    const receipt = await tx.wait();
    
    // Check that transaction succeeded (no revert)
    expect(receipt.status).to.equal(1);
    
    // Get balances after
    const balanceAfter = await ethers.provider.getBalance(recipient);
    
    // In the original contract, the caddress.call would attempt to call transferFrom
    // which might fail silently or succeed depending on the contract at caddress
    // The key test is that the transaction doesn't revert
    // For the mutant, 2 ** 10^18 would cause an arithmetic overflow in Solidity 0.8+
    // causing the transaction to revert, which would make receipt.status = 0
  });
});