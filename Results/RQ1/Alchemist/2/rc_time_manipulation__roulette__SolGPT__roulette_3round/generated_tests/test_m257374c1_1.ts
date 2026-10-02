import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m257374c1 test", function () {
  it("should detect mutant by checking no payout when block.number % 15 == 1", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const instanceAddress = await instance.getAddress();

    // Get current block number and find the next block where block.number % 15 == 1
    let currentBlock = await ethers.provider.getBlockNumber();
    let targetBlock = currentBlock + 1;
    // Ensure target block satisfies: targetBlock % 15 == 1
    while (targetBlock % 15 !== 1) {
      targetBlock++;
    }

    // Mine blocks to reach the target block
    const blocksToMine = targetBlock - currentBlock - 1;
    for (let i = 0; i < blocksToMine; i++) {
      await ethers.provider.send("evm_mine", []);
    }

    // Send exactly 10 ether to the contract in the target block (block.number % 15 == 1)
    const tx = await owner.sendTransaction({
      to: instanceAddress,
      value: ethers.parseEther("10"),
    });
    await tx.wait();

    // Verify contract balance - mutant would have paid out, original would not
    const balance = await ethers.provider.getBalance(instanceAddress);
    expect(balance).to.equal(ethers.parseEther("10"));
  });
});