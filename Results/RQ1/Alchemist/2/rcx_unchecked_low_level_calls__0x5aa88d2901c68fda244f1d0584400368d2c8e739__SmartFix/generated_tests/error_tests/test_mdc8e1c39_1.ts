import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 mutant mdc8e1c39 test", function () {
  it("should detect the mutant by sending msg.value equal to balance - 1 wei", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some initial balance
    const initialBalance = ethers.parseEther("10");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: initialBalance
    });

    // Get the current contract balance
    const contractBalance = await ethers.provider.getBalance(await instance.getAddress());
    
    // Send exactly balance - 1 wei to multiplicate
    const sendAmount = contractBalance - 1n;
    
    // Record balances before
    const recipientBalanceBefore = await ethers.provider.getBalance(addr1.address);
    const contractBalanceBefore = await ethers.provider.getBalance(await instance.getAddress());

    // Execute the multiplicate call
    await instance.connect(owner).multiplicate(addr1.address, { value: sendAmount });

    // Check balances after
    const recipientBalanceAfter = await ethers.provider.getBalance(addr1.address);
    const contractBalanceAfter = await ethers.provider.getBalance(await instance.getAddress());

    // Original: condition is false (msg.value < balance), so no transfer should happen
    // Mutant: condition is true (msg.value+1 >= balance), so transfer happens
    // Assert that no transfer occurred (original behavior) - this will fail on mutant
    expect(recipientBalanceAfter).to.equal(recipientBalanceBefore);
    expect(contractBalanceAfter).to.equal(contractBalanceBefore);
  });
});