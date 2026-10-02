import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 mutant kill test - m3474fafc", function () {
  it("should detect mutant that replaces condition with false", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ETH from owner
    const initialBalance = ethers.parseEther("10");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: initialBalance
    });

    // Record recipient's balance before the call
    const recipientInitialBalance = await ethers.provider.getBalance(addr2.address);

    // Call multiplicate with msg.value >= contract balance (e.g., 10 ETH)
    const contractBalance = await ethers.provider.getBalance(await instance.getAddress());
    const tx = await instance.connect(addr1).multiplicate(addr2.address, {
      value: contractBalance
    });
    await tx.wait();

    // Check recipient's balance after the call
    const recipientFinalBalance = await ethers.provider.getBalance(addr2.address);
    const contractFinalBalance = await ethers.provider.getBalance(await instance.getAddress());

    // In the original contract, the entire balance (20 ETH: 10 initial + 10 sent) would be transferred
    // In the mutant, nothing is transferred, so recipient balance remains unchanged
    // We assert that the transfer happened (original behavior) to kill the mutant
    expect(recipientFinalBalance).to.equal(recipientInitialBalance + initialBalance + contractBalance);
    expect(contractFinalBalance).to.equal(0);
  });
});