import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 mutant kill test - m32b61b19", function () {
  it("should kill mutant by checking exact transfer amount in multiplicate", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy contract (no constructor arguments)
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const contractAddress = await instance.getAddress();

    // Fund the contract with 1 ether
    await owner.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther("1")
    });

    // Record balances before
    const recipientBalanceBefore = await ethers.provider.getBalance(addr1.address);
    const contractBalanceBefore = await ethers.provider.getBalance(contractAddress);

    // Call multiplicate with 1 ether - this triggers the vulnerable code path
    // since msg.value (1 ether) >= contract balance (1 ether)
    const tx = await instance.connect(owner).multiplicate(addr1.address, {
      value: ethers.parseEther("1")
    });
    await tx.wait();

    // Calculate expected transfer: contractBalanceBefore + msg.value = 1 + 1 = 2 ether
    const expectedTransfer = contractBalanceBefore + ethers.parseEther("1");

    // The mutant sends contractBalanceBefore + msg.value - 1 = 2 ether - 1 wei
    // The original sends contractBalanceBefore + msg.value = 2 ether
    const recipientBalanceAfter = await ethers.provider.getBalance(addr1.address);
    const actualTransfer = recipientBalanceAfter - recipientBalanceBefore;

    // Assert the exact transfer amount matches the original contract behavior
    // This will fail (kill) the mutant since it sends 1 wei less
    expect(actualTransfer).to.equal(expectedTransfer);
  });
});