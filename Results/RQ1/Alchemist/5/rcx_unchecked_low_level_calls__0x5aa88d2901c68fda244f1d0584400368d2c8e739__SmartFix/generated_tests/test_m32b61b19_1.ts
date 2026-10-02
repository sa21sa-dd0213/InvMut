import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 mutant detection", function () {
  it("should detect the mutant by checking exact transfer amount when msg.value equals contract balance", async function () {
    const [owner, recipient] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with initial balance
    const initialBalance = ethers.parseEther("1.0");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: initialBalance
    });

    // Get current contract balance
    const contractBalanceBefore = await ethers.provider.getBalance(
      await instance.getAddress()
    );

    // Send exactly the contract balance as msg.value to trigger the vulnerable branch
    const tx = await instance.connect(owner).multiplicate(
      await recipient.getAddress(),
      { value: contractBalanceBefore }
    );
    await tx.wait();

    // Calculate expected amount: original would send (balance + msg.value) = 2 * contractBalanceBefore
    // Mutant would send (balance + msg.value - 1) = 2 * contractBalanceBefore - 1
    const expectedOriginal = contractBalanceBefore + contractBalanceBefore; // 2 * initial balance
    const expectedMutant = expectedOriginal - 1n; // One wei less

    // Check recipient balance - if it's the original amount, mutant is killed
    // (test passes if original behavior, fails if mutant)
    const recipientBalance = await ethers.provider.getBalance(
      await recipient.getAddress()
    );
    
    // For the original, recipient gets exactly 2 * contractBalanceBefore
    // For the mutant, recipient gets 1 wei less
    // We assert it equals the original amount - this will fail on the mutant
    expect(recipientBalance).to.equal(expectedOriginal);
  });
});