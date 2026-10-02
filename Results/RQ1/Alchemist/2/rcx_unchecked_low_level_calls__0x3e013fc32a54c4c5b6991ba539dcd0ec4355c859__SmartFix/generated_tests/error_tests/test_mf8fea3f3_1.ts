import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 mutant test - mf8fea3f3", function () {
  it("should detect subtraction mutant in multiplicate function", async function () {
    const [owner, attacker] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with 1 ETH
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Get initial balances
    const initialContractBalance = await ethers.provider.getBalance(await instance.getAddress());
    const initialAttackerBalance = await ethers.provider.getBalance(attacker.address);

    // Send exactly 1 ETH to trigger the condition msg.value >= address(this).balance
    const tx = await instance.connect(owner).multiplicate(attacker.address, {
      value: ethers.parseEther("1.0")
    });
    await tx.wait();

    // Check final balances
    const finalContractBalance = await ethers.provider.getBalance(await instance.getAddress());
    const finalAttackerBalance = await ethers.provider.getBalance(attacker.address);

    // Original would transfer: balance + msg.value = 1 + 1 = 2 ETH
    // Mutant transfers: balance - msg.value = 1 - 1 = 0 ETH
    // If attacker balance increased by 2 ETH, mutant is NOT killed (original behavior)
    // If attacker balance increased by 0 ETH (or only gas spent), mutant IS killed
    const attackerGained = finalAttackerBalance - initialAttackerBalance;
    
    // The mutant would transfer 0, so attacker balance should NOT increase by 2 ETH
    expect(attackerGained).to.be.lessThan(ethers.parseEther("2.0"));
    
    // The contract should still have its original balance (1 ETH) if mutant is active
    // since it transferred 0 to attacker
    expect(finalContractBalance).to.equal(initialContractBalance);
  });
});