import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 - Kill mutant me60c0f74", function () {
  it("should fail on mutant when sending exactly the contract balance", async function () {
    const [owner, attacker, recipient] = await ethers.getSigners();

    // Deploy contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const contractAddress = await instance.getAddress();

    // Fund contract with some ETH
    const fundAmount = ethers.parseEther("10");
    await owner.sendTransaction({
      to: contractAddress,
      value: fundAmount
    });

    // Get initial balances
    const initialRecipientBalance = await ethers.provider.getBalance(recipient.address);
    const contractBalanceBefore = await ethers.provider.getBalance(contractAddress);

    // Send exactly the contract balance to trigger multiplicate
    const tx = await attacker.sendTransaction({
      to: contractAddress,
      value: contractBalanceBefore,
      data: instance.interface.encodeFunctionData("multiplicate", [recipient.address])
    });
    await tx.wait();

    const finalRecipientBalance = await ethers.provider.getBalance(recipient.address);
    const contractBalanceAfter = await ethers.provider.getBalance(contractAddress);

    // Original: recipient gets contractBalanceBefore * 2 (since msg.value == contractBalanceBefore)
    // Mutant: condition fails (msg.value-1 < contractBalanceBefore), so no transfer occurs
    // Assert that recipient received funds (passes on original, fails on mutant)
    expect(finalRecipientBalance).to.equal(initialRecipientBalance + contractBalanceBefore * 2n);
    expect(contractBalanceAfter).to.equal(0n);
  });
});