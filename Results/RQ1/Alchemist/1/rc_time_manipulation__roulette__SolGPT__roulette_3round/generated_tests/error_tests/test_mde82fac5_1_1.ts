import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant mde82fac5 test", function () {
  it("should detect mutant by sending 11 ether (>= instead of ==) and checking balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const contractAddress = await instance.getAddress();

    // Fund the contract with 10 ether (original requirement)
    await owner.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther("10")
    });

    // Get initial balance
    const initialBalance = await ethers.provider.getBalance(contractAddress);
    expect(initialBalance).to.equal(ethers.parseEther("10"));

    // Send 11 ether on a block where block.number % 15 != 0 (to avoid immediate payout)
    // We can't control block.number, but we can ensure the transaction is mined
    // The important thing: the mutant accepts >= 10, so 11 ether should work
    const tx = await addr1.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther("11")
    });
    await tx.wait();

    // In the original contract, this would revert because msg.value != 10 ether
    // In the mutant, this should succeed and potentially trigger the payout
    // We check that the balance changed (mutant accepted the 11 ether)
    const finalBalance = await ethers.provider.getBalance(contractAddress);
    
    // If mutant is present, the 11 ether transaction succeeded
    // If original contract, the transaction would have reverted
    // We can detect this by checking if balance increased or if a revert occurred
    // Actually, we need to test if the transaction reverted or not
    
    // Let's redo: wrap in try/catch to see if it reverts
    try {
      const tx2 = await addr1.sendTransaction({
        to: contractAddress,
        value: ethers.parseEther("11")
      });
      await tx2.wait();
      
      // If we get here, mutant is present (no revert)
      const balanceAfter = await ethers.provider.getBalance(contractAddress);
      // The balance should have increased by 11 ether (minus any possible payout)
      expect(balanceAfter).to.be.gt(initialBalance);
    } catch (error: any) {
      // If revert, original contract is present
      expect(error.message).to.include("revert");
    }
  });
});