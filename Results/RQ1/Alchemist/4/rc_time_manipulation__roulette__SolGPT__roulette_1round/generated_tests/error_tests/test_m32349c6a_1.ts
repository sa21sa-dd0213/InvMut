import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant detection test", function () {
  it("should detect mutant that changes == to != in block.number % 15 condition", async function () {
    const [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy({ value: ethers.parseEther("10") });
    await instance.waitForDeployment();

    // Record user's initial balance
    const initialBalance = await ethers.provider.getBalance(user.address);

    // We need to call the fallback when block.number % 15 == 0
    // First, find a block number that satisfies this condition
    let currentBlock = await ethers.provider.getBlockNumber();
    let targetBlock = currentBlock;
    while (targetBlock % 15 !== 0) {
      targetBlock++;
    }

    // Mine blocks to reach the target block
    while ((await ethers.provider.getBlockNumber()) < targetBlock) {
      await ethers.provider.send("evm_mine", []);
    }

    // Now call the fallback function with exactly 10 ether
    const tx = await user.sendTransaction({
      to: instance.target,
      value: ethers.parseEther("10")
    });
    await tx.wait();

    // Check user's balance - original would transfer entire contract balance
    // Mutant would NOT transfer because condition != 0 is false when % 15 == 0
    const finalBalance = await ethers.provider.getBalance(user.address);
    const contractBalance = await ethers.provider.getBalance(instance.target);

    // On original: user receives contract balance (which was 10 ether from deploy + 10 ether from user = 20 ether)
    // On mutant: user does NOT receive anything, contract still holds 20 ether
    // So if balance increased by contract balance, original works; if not, it's the mutant
    const expectedTransfer = contractBalance + ethers.parseEther("10"); // user sent 10, so net should be +contractBalance
    // Actually simpler: original sends contract balance to user, so user's net change = contractBalance_before - 10 (their own deposit)
    // But easier: just check that contract balance is zero on original (all sent out), or non-zero on mutant
    if (contractBalance === BigInt(0)) {
      // This is the original behavior
      expect(finalBalance).to.be.gt(initialBalance);
    } else {
      // This is the mutant - it failed to send
      expect(contractBalance).to.be.gt(0);
      // Force test to fail if it reaches here (mutant detected)
      expect(true).to.equal(false, "Mutant detected: condition changed from == to !=");
    }
  });
});