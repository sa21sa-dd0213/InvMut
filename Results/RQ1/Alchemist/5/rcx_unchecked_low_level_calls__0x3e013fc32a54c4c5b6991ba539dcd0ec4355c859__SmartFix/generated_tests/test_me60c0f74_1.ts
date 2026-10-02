import { expect } from "chai";
import { ethers } } from "hardhat";

describe("MultiplicatorX4 mutant test - me60c0f74", function () {
  it("should kill mutant by sending exactly the contract balance and verifying transfer", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Fund contract with 1 ether via receive function
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    
    // Get initial contract balance
    const initialBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(initialBalance).to.equal(ethers.parseEther("1.0"));
    
    // Get addr1's balance before
    const addr1BalanceBefore = await ethers.provider.getBalance(addr1.address);
    
    // Call multiplicate with exactly the contract balance (1 ether)
    // Original: msg.value >= balance => true (1 >= 1)
    // Mutant: msg.value - 1 >= balance => false (0 >= 1)
    const tx = await instance.connect(owner).multiplicate(addr1.address, {
      value: ethers.parseEther("1.0")
    });
    await tx.wait();
    
    // Check that addr1 received the funds (original behavior)
    // On mutant, no transfer happens so balance stays same
    const addr1BalanceAfter = await ethers.provider.getBalance(addr1.address);
    
    // If original: addr1 gets 2 ether (contract balance + msg.value)
    // If mutant: no transfer, addr1 balance unchanged
    expect(addr1BalanceAfter).to.equal(addr1BalanceBefore + ethers.parseEther("2.0"));
  });
});