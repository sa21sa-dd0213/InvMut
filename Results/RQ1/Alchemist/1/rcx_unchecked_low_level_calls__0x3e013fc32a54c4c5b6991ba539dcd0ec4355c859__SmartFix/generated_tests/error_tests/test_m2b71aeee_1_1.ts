import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 mutant kill test - m2b71aeee", function () {
  it("should kill the mutant by verifying addition is used instead of multiplication in multiplicate", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some initial balance
    const initialBalance = ethers.parseEther("10");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: initialBalance
    });

    // Check initial contract balance
    const contractBalanceBefore = await ethers.provider.getBalance(await instance.getAddress());
    expect(contractBalanceBefore).to.equal(initialBalance);

    // addr1 will send value that triggers multiplicate
    // Original: transfer(address(this).balance + msg.value) = 10 + 5 = 15 ETH
    // Mutant: transfer(address(this).balance * msg.value) = 10 * 5 = 50 ETH
    const sendValue = ethers.parseEther("5");
    const addr1BalanceBefore = await ethers.provider.getBalance(addr1.address);

    // Call multiplicate from owner (onlyOwner) with msg.value
    await instance.connect(owner).multiplicate(addr1.address, { value: sendValue });

    // Expected transfer amount with ORIGINAL code: 10 + 5 = 15 ETH
    const expectedTransfer = ethers.parseEther("15");
    const addr1BalanceAfter = await ethers.provider.getBalance(addr1.address);
    const actualTransfer = addr1BalanceAfter - addr1BalanceBefore;

    // If mutant is alive, actualTransfer will be 50 ETH instead of 15 ETH
    // This assertion will fail on the mutant, killing it
    expect(actualTransfer).to.equal(expectedTransfer);
  });
});