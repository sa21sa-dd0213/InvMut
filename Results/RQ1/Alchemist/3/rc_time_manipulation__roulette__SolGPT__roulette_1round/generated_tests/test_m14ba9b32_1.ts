import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m14ba9b32 test", function () {
  it("should detect mutant where block.number+1 is used instead of block.number", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get current block number and calculate the next block where block.number % 15 == 14
    const currentBlock = await ethers.provider.getBlockNumber();
    const blocksUntil14 = (14 - (currentBlock % 15) + 15) % 15;
    const targetBlock = currentBlock + blocksUntil14;

    // Mine blocks to reach a block where block.number % 15 == 14
    await ethers.provider.send("hardhat_mine", [ethers.toBeHex(targetBlock - currentBlock)]);

    // Send exactly 10 ether to the contract
    const tx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx.wait();

    // At block.number % 15 == 14, original contract keeps balance, mutant pays out
    // Check balance after the transaction
    const contractBalance = await ethers.provider.getBalance(await instance.getAddress());
    
    // If the mutant is active, balance should be 0 (payout occurred)
    // If original, balance should be 10 ether
    expect(contractBalance).to.equal(ethers.parseEther("10"));
  });
});