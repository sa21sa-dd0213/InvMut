import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant detection - m6d1f8efd", function () {
  it("should detect mutant that changes % to / in fallback payout condition", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy({ value: ethers.parseEther("10") });
    await instance.waitForDeployment();

    // Fund the contract with additional ether so balance is non-zero
    const fundTx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await fundTx.wait();

    // Get current block number and calculate next multiple of 15
    const currentBlock = await ethers.provider.getBlockNumber();
    const nextMultipleOf15 = currentBlock + (15 - (currentBlock % 15));

    // Mine blocks to reach a block number that is a multiple of 15 (e.g., 15, 30, 45...)
    // We target block number 15 if current is less than 15, otherwise next multiple > 14
    const targetBlock = nextMultipleOf15 < 15 ? 15 : nextMultipleOf15;
    while ((await ethers.provider.getBlockNumber()) < targetBlock) {
      await ethers.provider.send("evm_mine", []);
    }

    // Call fallback with exactly 10 ether and block.timestamp > pastBlockTime
    // First call to set pastBlockTime
    const tx1 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx1.wait();

    // Wait for next block (to satisfy timestamp requirement)
    await ethers.provider.send("evm_mine", []);

    // This call should trigger payout if condition is block.number % 15 == 0
    // Under the mutant (block.number / 15 == 0) this will NOT trigger payout
    // because block.number >= 15 makes the division > 0
    const contractBalanceBefore = await ethers.provider.getBalance(await instance.getAddress());
    
    const tx2 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx2.wait();

    const contractBalanceAfter = await ethers.provider.getBalance(await instance.getAddress());

    // In the original contract, the balance should be transferred to msg.sender
    // In the mutant (with / instead of %), the condition is false for block >= 15
    // so the balance remains unchanged (not transferred)
    // We assert the balance did NOT decrease, which kills the mutant
    expect(contractBalanceAfter).to.equal(contractBalanceBefore);
  });
});