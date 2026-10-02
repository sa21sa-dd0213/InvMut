import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 mutant kill test", function () {
  it("should kill mutant m20108da4 by sending exactly contract balance", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether (e.g., 2 ether)
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("2")
    });

    // Check initial balance of addr2 (target)
    const initialBalanceAddr2 = await ethers.provider.getBalance(addr2.address);

    // Get current contract balance
    const contractBalance = await ethers.provider.getBalance(await instance.getAddress());

    // Send exactly the contract balance to trigger the multiplicate function
    const tx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: contractBalance,
      data: instance.interface.encodeFunctionData("multiplicate", [addr2.address])
    });
    await tx.wait();

    // After the call, addr2 should have received contractBalance + msg.value = 2 * contractBalance
    const finalBalanceAddr2 = await ethers.provider.getBalance(addr2.address);
    const expectedReceived = contractBalance + contractBalance; // since msg.value == contractBalance

    // On original: transfer happens, on mutant: condition fails (msg.value-1 < contractBalance)
    // So if mutant is present, addr2 balance remains unchanged
    expect(finalBalanceAddr2).to.equal(initialBalanceAddr2 + expectedReceived);
  });
});