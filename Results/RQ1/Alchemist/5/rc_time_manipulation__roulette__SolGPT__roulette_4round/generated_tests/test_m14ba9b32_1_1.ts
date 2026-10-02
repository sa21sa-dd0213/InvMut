import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m14ba9b32 test", function () {
  it("should kill mutant by sending 10 ether when block.number % 15 == 0 and expecting payout", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const instanceAddress = await instance.getAddress();

    // Fund the contract with initial balance so it can pay out
    await owner.sendTransaction({
      to: instanceAddress,
      value: ethers.parseEther("10")
    });

    // Find a block where block.number % 15 == 0
    let currentBlock = await ethers.provider.getBlockNumber();
    let targetBlock = currentBlock;
    while (targetBlock % 15 !== 0) {
      targetBlock++;
    }

    // Mine blocks to reach the target block
    if (targetBlock > currentBlock) {
      await ethers.provider.send("hardhat_mine", [(targetBlock - currentBlock).toString()]);
    }

    // Verify we are at the correct block
    const blockNum = await ethers.provider.getBlockNumber();
    expect(blockNum % 15).to.equal(0);

    // Get balance before
    const balanceBefore = await ethers.provider.getBalance(instanceAddress);

    // addr1 sends 10 ether to trigger fallback
    const tx = await addr1.sendTransaction({
      to: instanceAddress,
      value: ethers.parseEther("10")
    });
    await tx.wait();

    // Get balance after
    const balanceAfter = await ethers.provider.getBalance(instanceAddress);

    // Original contract should have paid out (balance decreased by 10 ether)
    // Mutant would NOT pay out at this block, so balance would remain
    expect(balanceAfter).to.be.lessThan(balanceBefore);
  });
});