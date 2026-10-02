import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 mutant detection - m5e3e89a8", function () {
  it("should detect mutant where >= is replaced with <= in multiplicate function", async function () {
    const [owner, attacker] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some initial balance
    const initialFund = ethers.parseEther("10");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: initialFund
    });

    const contractBalanceBefore = await ethers.provider.getBalance(await instance.getAddress());
    expect(contractBalanceBefore).to.equal(initialFund);

    // Send value greater than contract balance (e.g., 20 ETH when balance is 10 ETH)
    const sendValue = ethers.parseEther("20");
    const attackerBalanceBefore = await ethers.provider.getBalance(attacker.address);

    // In the original contract, the condition msg.value >= address(this).balance is true
    // In the mutant, msg.value <= address(this).balance is false (20 <= 10 is false)
    // So the transfer should NOT happen in the mutant
    await instance.connect(attacker).multiplicate(attacker.address, { value: sendValue });

    const contractBalanceAfter = await ethers.provider.getBalance(await instance.getAddress());
    const attackerBalanceAfter = await ethers.provider.getBalance(attacker.address);

    // If mutant is present, contract balance remains unchanged (no transfer happened)
    // If original, contract balance would be 0 (all funds sent to attacker)
    // We expect the mutant behavior: balance stays the same
    expect(contractBalanceAfter).to.equal(contractBalanceBefore);
    
    // Attacker should have only lost gas (no transfer received)
    expect(attackerBalanceAfter).to.be.lessThan(attackerBalanceBefore.sub(sendValue));
  });
});