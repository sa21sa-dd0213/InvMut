import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 - Kill mutant mc9495329", function () {
  it("should detect the arithmetic mutation (replace + with -) in multiplicate function", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with 2 ETH from owner
    const initialBalance = ethers.parseEther("2");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: initialBalance
    });

    // Get contract balance before multiplicate call
    const contractBalanceBefore = await ethers.provider.getBalance(await instance.getAddress());
    expect(contractBalanceBefore).to.equal(initialBalance);

    // Get addr1's balance before
    const addr1BalanceBefore = await ethers.provider.getBalance(addr1.address);

    // Call multiplicate with msg.value equal to contract balance (2 ETH)
    const msgValue = initialBalance;
    const tx = await instance.connect(addr1).multiplicate(addr1.address, { value: msgValue });
    await tx.wait();

    // Get addr1's balance after
    const addr1BalanceAfter = await ethers.provider.getBalance(addr1.address);

    // Original: sends contractBalanceBefore + msgValue = 2 + 2 = 4 ETH
    // Mutant: sends contractBalanceBefore - msgValue = 2 - 2 = 0 ETH
    // Expected original behavior: addr1 receives 4 ETH
    const expectedTransfer = initialBalance + msgValue; // 4 ETH
    const actualTransfer = addr1BalanceAfter - addr1BalanceBefore;

    // If mutant is present, actualTransfer will be 0, not 4 ETH
    expect(actualTransfer).to.equal(expectedTransfer);
  });
});