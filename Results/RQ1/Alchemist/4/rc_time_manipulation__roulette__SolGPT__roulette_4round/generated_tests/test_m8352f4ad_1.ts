import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m8352f4ad - payout condition disabled", function () {
  it("should transfer full balance to caller when block.number % 15 == 0, but mutant with false never transfers", async function () {
    const [owner, caller] = await ethers.getSigners();
    const Factory = await ethert.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with initial balance (e.g., from a previous call)
    const initialFundTx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await initialFundTx.wait();

    // Record caller's balance before
    const callerBalanceBefore = await ethers.provider.getBalance(caller.address);

    // Send exactly 10 ether to trigger fallback, and ensure block.number % 15 == 0
    // We need to mine blocks until condition is met, then call fallback
    while ((await ethers.provider.getBlock("latest")).number % 15 !== 0) {
      await ethers.provider.send("evm_mine");
    }

    // Call fallback by sending 10 ether from caller
    const tx = await caller.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx.wait();

    const callerBalanceAfter = await ethers.provider.getBalance(caller.address);
    const contractBalance = await ethers.provider.getBalance(await instance.getAddress());

    // Original: contract balance becomes 0 (all sent to caller)
    // Mutant: contract balance remains (no transfer), caller only loses 10 ether
    // We expect the original behavior: caller gains ~10 ether (balance increase), contract empty
    // Mutant will fail because caller balance decreased (gas) and contract still has funds
    expect(callerBalanceAfter).to.be.gt(callerBalanceBefore);
    expect(contractBalance).to.equal(0);
  });
});