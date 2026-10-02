import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 - kill mutant m20108da4", function () {
  it("should transfer entire balance when msg.value equals address(this).balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const instanceAddress = await instance.getAddress();

    // Fund the contract with some ether
    const initialBalance = ethers.parseEther("1.0");
    await owner.sendTransaction({
      to: instanceAddress,
      value: initialBalance
    });

    // Verify contract has the expected balance
    expect(await ethers.provider.getBalance(instanceAddress)).to.equal(initialBalance);

    // Get addr1's balance before the transfer
    const addr1BalanceBefore = await ethers.provider.getBalance(addr1.address);

    // Call multiplicate with msg.value exactly equal to contract balance
    const tx = await instance.connect(owner).multiplicate(addr1.address, { value: initialBalance });
    await tx.wait();

    // After the operation, contract balance should be zero (transferred everything)
    expect(await ethers.provider.getBalance(instanceAddress)).to.equal(0n);

    // addr1 should have received initialBalance (original contract) + msg.value (initialBalance)
    // But the mutant with msg.value-1 would NOT execute the transfer when values are equal
    const addr1BalanceAfter = await ethers.provider.getBalance(addr1.address);
    const expectedTransfer = initialBalance + initialBalance; // original sends contract balance + msg.value
    expect(addr1BalanceAfter - addr1BalanceBefore).to.equal(expectedTransfer);
  });
});