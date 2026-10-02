import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 mutant m8d1991bc test", function () {
  it("should kill mutant by sending msg.value >= contract balance and verifying recipient gets funds", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some initial balance
    const initialFund = ethers.parseEther("10");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: initialFund
    });

    // Get contract balance before
    const contractBalanceBefore = await ethers.provider.getBalance(await instance.getAddress());

    // addr2 balance before
    const addr2BalanceBefore = await ethers.provider.getBalance(addr2.address);

    // Send msg.value equal to contract balance (meets condition)
    const msgValue = contractBalanceBefore;
    await instance.connect(owner).multiplicate(addr2.address, { value: msgValue });

    // Get balances after
    const contractBalanceAfter = await ethers.provider.getBalance(await instance.getAddress());
    const addr2BalanceAfter = await ethers.provider.getBalance(addr2.address);

    // Original: contract should be empty, addr2 should get contractBalanceBefore + msgValue
    // Mutant: contract retains funds, addr2 gets nothing
    // This assertion will fail on mutant (kill it)
    expect(addr2BalanceAfter - addr2BalanceBefore).to.equal(contractBalanceBefore + msgValue);
  });
});