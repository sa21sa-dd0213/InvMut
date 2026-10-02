import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant detection - me0f42c11", function () {
  it("should kill mutant by checking payout on a block number that is a multiple of 15", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with initial balance for transfer
    const fundTx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("100")
    });
    await fundTx.wait();

    // Get the current block number
    let currentBlock = await ethers.provider.getBlockNumber();
    
    // Mine blocks until we reach a block number that is a multiple of 15
    const targetBlock = Math.ceil((currentBlock + 1) / 15) * 15;
    while ((await ethers.provider.getBlockNumber()) < targetBlock) {
      await ethers.provider.send("evm_mine", []);
    }

    // Now current block is a multiple of 15 - send exactly 10 ether to trigger condition
    const contractAddress = await instance.getAddress();
    const balanceBefore = await ethers.provider.getBalance(contractAddress);
    
    const tx = await addr1.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther("10")
    });
    await tx.wait();

    const balanceAfter = await ethers.provider.getBalance(contractAddress);
    
    // On original: payout occurs (balance decreases by 10 ether)
    // On mutant: condition block.number / 15 == 0 is false (since block >= 15), so no payout
    // This difference kills the mutant
    expect(balanceAfter).to.be.lessThan(balanceBefore);
  });
});