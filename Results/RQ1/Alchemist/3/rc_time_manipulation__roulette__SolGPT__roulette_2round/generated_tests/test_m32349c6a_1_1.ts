import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant detection - fallback condition change", function () {
  it("should detect mutant by sending 10 ether when block.number % 15 == 0 and verifying payout is sent", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const contractAddress = await instance.getAddress();

    // Get current block and calculate next block that is divisible by 15
    let currentBlock = await ethers.provider.getBlock("latest");
    let targetBlockNumber = currentBlock!.number + 1;
    // Adjust target to next block where block.number % 15 == 0
    while (targetBlockNumber % 15 !== 0) {
      targetBlockNumber++;
    }

    // Mine blocks until we reach the target block
    const blocksToMine = targetBlockNumber - currentBlock!.number;
    for (let i = 0; i < blocksToMine; i++) {
      await ethers.provider.send("evm_mine", []);
    }

    // Verify we are at the correct block
    const blockBefore = await ethers.provider.getBlock("latest");
    expect(blockBefore!.number % 15).to.equal(0);

    // Get initial contract balance
    const initialBalance = await ethers.provider.getBalance(contractAddress);

    // Send 10 ether to the contract
    const tx = await owner.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther("10"),
    });
    await tx.wait();

    // Check if payout was sent (balance should decrease by 10 ether if condition was true)
    const finalBalance = await ethers.provider.getBalance(contractAddress);

    // On original: balance should be 0 (payout sent)
    // On mutant: balance should remain 10 (payout NOT sent because condition is !=0)
    expect(finalBalance).to.equal(0);
  });
});