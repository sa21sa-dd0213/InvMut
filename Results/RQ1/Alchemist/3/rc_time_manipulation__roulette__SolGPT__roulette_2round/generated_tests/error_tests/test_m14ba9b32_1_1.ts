import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m14ba9b32", function () {
  it("should detect mutant by sending 10 ether when block.number is multiple of 15", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy({ value: ethers.parseEther("0") });
    await instance.waitForDeployment();

    // Get current block number and calculate next multiple of 15
    const currentBlock = await ethers.provider.getBlockNumber();
    const nextMultiple = Math.ceil(currentBlock / 15) * 15;
    const blocksToMine = nextMultiple - currentBlock;

    // Mine blocks to reach a block where block.number % 15 == 0
    for (let i = 0; i < blocksToMine; i++) {
      await ethers.provider.send("evm_mine", []);
    }

    // Verify we are at the right block
    const targetBlock = await ethers.provider.getBlockNumber();
    expect(targetBlock % 15).to.equal(0);

    // Get balance before sending
    const balanceBefore = await ethers.provider.getBalance(addr1.address);

    // Send exactly 10 ether from addr1
    const tx = await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx.wait();

    // Check balance after - on original, the full balance should be transferred back
    const balanceAfter = await ethers.provider.getBalance(addr1.address);

    // On original contract: balanceAfter should be ~balanceBefore (10 ether sent then returned)
    // On mutant: condition never true, so balanceAfter should be balanceBefore - 10 ether
    // The test kills the mutant if the transfer did NOT happen
    expect(balanceAfter).to.be.gt(balanceBefore - ethers.parseEther("10"));
  });
});