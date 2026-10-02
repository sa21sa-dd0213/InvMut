import { expect } from "chai";
import { ethers } } from "hardhat";

describe("Roulette mutant kill test - m32349c6a", function () {
  it("should kill mutant by checking no payout occurs when block.number % 15 == 0", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const contractAddress = await instance.getAddress();

    // Fund the contract with initial balance so we can detect transfers
    const initialFundTx = await owner.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther("1")
    });
    await initialFundTx.wait();

    // Get current block number and calculate the next block where block.number % 15 == 0
    const currentBlock = await ethers.provider.getBlock("latest");
    const currentBlockNumber = currentBlock.number;
    const blocksToAdd = 15 - (currentBlockNumber % 15);
    const targetBlockNumber = currentBlockNumber + blocksToAdd;

    // Mine blocks to reach the target block
    for (let i = 0; i < blocksToAdd; i++) {
      await ethers.provider.send("evm_mine");
    }

    // Record player's balance before the transaction
    const playerBalanceBefore = await ethers.provider.getBalance(player.address);
    const contractBalanceBefore = await ethers.provider.getBalance(contractAddress);

    // Player sends exactly 10 ether to trigger the fallback
    const tx = await player.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther("10")
    });
    await tx.wait();

    // Check contract balance - in original it should NOT decrease (no payout)
    const contractBalanceAfter = await ethers.provider.getBalance(contractAddress);
    const playerBalanceAfter = await ethers.provider.getBalance(player.address);

    // Original behavior: no transfer occurs, so contract balance increases by 10 ether
    expect(contractBalanceAfter).to.equal(contractBalanceBefore + ethers.parseEther("10"));
    
    // Player balance decreases by exactly 10 ether + gas costs
    const gasCost = tx.gasPrice * tx.gasLimit; // simplified check
    expect(playerBalanceAfter).to.be.lt(playerBalanceBefore - ethers.parseEther("10"));
    
    // The mutant would have transferred the whole contract balance, killing this test
    // because the contract balance would be much lower than expected
  });
});