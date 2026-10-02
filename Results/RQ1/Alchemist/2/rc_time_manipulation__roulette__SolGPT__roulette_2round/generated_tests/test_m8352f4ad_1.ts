import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant kill test - m8352f4ad", function () {
  it("should kill mutant by verifying payout at block number multiple of 15", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether for the payout
    const fundAmount = ethers.parseEther("10");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: fundAmount
    });

    // Get current block number and calculate next block that is a multiple of 15
    const currentBlock = await ethers.provider.getBlockNumber();
    const nextMultipleOf15 = Math.ceil((currentBlock + 1) / 15) * 15;
    
    // Mine blocks to reach the target block number
    const blocksToMine = nextMultipleOf15 - currentBlock - 1;
    if (blocksToMine > 0) {
      for (let i = 0; i < blocksToMine; i++) {
        await ethers.provider.send("evm_mine", []);
      }
    }

    // Get initial balance of addr1
    const initialBalance = await ethers.provider.getBalance(addr1.address);
    
    // addr1 sends exactly 10 ether to trigger fallback at the target block
    const tx = await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx.wait();

    // Get final balance of addr1
    const finalBalance = await ethers.provider.getBalance(addr1.address);
    
    // In the original contract, addr1 should receive the contract balance (fundAmount)
    // In the mutant (if(false)), no transfer occurs - addr1 only loses 10 ether
    const contractBalance = fundAmount; // The contract had fundAmount before addr1 sent 10 ether
    const expectedBalance = initialBalance - ethers.parseEther("10") + contractBalance;
    
    expect(finalBalance).to.equal(expectedBalance);
  });
});