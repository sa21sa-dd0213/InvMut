import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant detection - block.number vs block.number-1", function () {
  it("should detect mutant by checking payout at a block multiple of 15", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const contractAddress = await instance.getAddress();

    // Get current block number and calculate next block that is a multiple of 15
    const currentBlock = await ethers.provider.getBlock("latest");
    const currentBlockNumber = currentBlock.number;
    const blocksUntilMultiple = (15 - (currentBlockNumber % 15)) % 15;
    const targetBlockNumber = currentBlockNumber + blocksUntilMultiple + 1; // +1 to ensure we're at the multiple

    // Mine blocks until we reach the target block number
    while ((await ethers.provider.getBlock("latest")).number < targetBlockNumber - 1) {
      await ethers.provider.send("evm_mine");
    }

    // Send 10 ether from addr1 in a block that will be a multiple of 15
    const tx = await addr1.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther("10")
    });
    const receipt = await tx.wait();
    const actualBlockNumber = receipt.blockNumber;

    // Verify we are at a block number that is a multiple of 15
    expect(actualBlockNumber % 15).to.equal(0);

    // Get contract balance after transaction
    const contractBalanceAfter = await ethers.provider.getBalance(contractAddress);

    // In the original contract, the balance should be 0 because it transfers all to msg.sender
    // In the mutant (block.number-1 % 15 == 0), it only transfers when block.number == 1
    // Since we're not at block 1, the balance should remain 10 ether in the mutant
    expect(contractBalanceAfter).to.equal(0);
  });
});