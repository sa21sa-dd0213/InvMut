import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant mda340d38 test", function () {
  it("should not payout when block number is not divisible by 15", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const contractAddress = await instance.getAddress();

    // Get current block number
    const blockNumBefore = await ethers.provider.getBlockNumber();
    
    // Find a block number that is NOT divisible by 15
    const targetBlock = blockNumBefore + 1;
    // Mine to a block where block.number % 15 != 0
    // If blockNumBefore % 15 == 0, we need to mine 1 block to get a non-divisible block
    // Otherwise we can use the next block directly
    const blocksToMine = (15 - (targetBlock % 15)) % 15 === 0 ? 1 : 1;
    
    // Send 10 ether to the contract on a block that is not divisible by 15
    const initialBalance = await ethers.provider.getBalance(contractAddress);
    const senderBalanceBefore = await ethers.provider.getBalance(addr1.address);
    
    // We need to ensure the transaction occurs on a block where block.number % 15 != 0
    // Let's mine to a block that satisfies this condition
    while (true) {
      const currentBlock = await ethers.provider.getBlockNumber();
      if (currentBlock % 15 !== 0) {
        break;
      }
      await ethers.provider.send("evm_mine", []);
    }
    
    // Send 10 ether to the contract
    const tx = await addr1.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther("10")
    });
    await tx.wait();
    
    // Check that the contract balance increased (no payout occurred)
    const finalBalance = await ethers.provider.getBalance(contractAddress);
    expect(finalBalance).to.equal(initialBalance + ethers.parseEther("10"));
    
    // Check that the sender's balance decreased by 10 ether (no refund)
    const senderBalanceAfter = await ethers.provider.getBalance(addr1.address);
    const gasCost = tx.gasPrice * tx.gasLimit; // approximate
    expect(senderBalanceAfter).to.equal(senderBalanceBefore - ethers.parseEther("10") - gasCost);
  });
});