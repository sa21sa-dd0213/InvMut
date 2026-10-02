import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 - Kill mutant mf8fea3f3", function () {
  it("should detect arithmetic operator mutation in multiplicate function", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether first
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // Get contract balance before the multiplicate call
    const contractBalanceBefore = await ethers.provider.getBalance(
      await instance.getAddress()
    );

    // Get addr2 balance before
    const addr2BalanceBefore = await ethers.provider.getBalance(addr2.address);

    // Call multiplicate with msg.value equal to contract balance
    // In original: sends balance + msg.value = 2 * balance
    // In mutant: sends balance - msg.value = 0 (or reverts due to underflow)
    const tx = await instance.connect(owner).multiplicate(addr2.address, {
      value: contractBalanceBefore
    });
    await tx.wait();

    // Get addr2 balance after
    const addr2BalanceAfter = await ethers.provider.getBalance(addr2.address);
    const amountReceived = addr2BalanceAfter - addr2BalanceBefore;

    // In the original, addr2 should receive 2 * contractBalanceBefore
    // In the mutant, addr2 would receive 0 (balance - balance = 0)
    expect(amountReceived).to.equal(contractBalanceBefore * 2n);
  });
});