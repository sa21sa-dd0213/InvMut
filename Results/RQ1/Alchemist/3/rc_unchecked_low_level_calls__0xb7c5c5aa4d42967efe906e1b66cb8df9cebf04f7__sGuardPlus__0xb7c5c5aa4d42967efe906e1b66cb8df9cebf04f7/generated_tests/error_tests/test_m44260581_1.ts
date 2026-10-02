import { expect } from "chai";
import { ethers } from "hardhat";

describe("keepMyEther mutant test - reentrancy guard removal", function () {
  it("should detect missing reentrancy guard by performing a reentrancy attack", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy the target contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("keepMyEther");
    const target = await Factory.deploy();
    await target.waitForDeployment();
    const targetAddress = await target.getAddress();

    // Deploy the attacker contract that will perform reentrancy
    const AttackerFactory = await ethers.getContractFactory("ReentrancyAttacker");
    const attackerContract = await AttackerFactory.deploy(targetAddress);
    await attackerContract.waitForDeployment();

    // Fund the target contract with some Ether (e.g., 10 ETH)
    await owner.sendTransaction({
      to: targetAddress,
      value: ethers.parseEther("10")
    });

    // Attacker sends 1 ETH to target via fallback to create a balance for themselves
    await attacker.sendTransaction({
      to: targetAddress,
      value: ethers.parseEther("1")
    });

    // Verify attacker's balance in target contract
    expect(await target.balances(attacker.address)).to.equal(ethers.parseEther("1"));

    // Check target contract balance before attack
    const targetBalanceBefore = await ethers.provider.getBalance(targetAddress);
    expect(targetBalanceBefore).to.equal(ethers.parseEther("11")); // 10 from owner + 1 from attacker

    // Execute the attack - attacker contract calls withdraw
    const attackTx = await attackerContract.connect(attacker).attack({ gasLimit: 300000 });
    await attackTx.wait();

    // In the original contract with reentrancy guard, the attacker would only get their 1 ETH
    // In the mutant (no guard), the attacker can drain more funds
    // Check if target contract lost more than 1 ETH (indicating reentrancy succeeded)
    const targetBalanceAfter = await ethers.provider.getBalance(targetAddress);
    
    // The test should pass on original (attacker gets only 1 ETH, target has 10 left)
    // The test should fail on mutant (attacker drains more, target has less than 10)
    // We expect the target to have exactly 10 ETH (only attacker's 1 ETH was taken)
    expect(targetBalanceAfter).to.equal(ethers.parseEther("10"));
    
    // Verify attacker contract balance increased by at least 1 ETH
    const attackerContractBalance = await ethers.provider.getBalance(attackerContract.getAddress());
    expect(attackerContractBalance).to.be.at.least(ethers.parseEther("1"));
  });
});