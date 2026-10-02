import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m0c4ffa1e test", function () {
  it("should not transfer balance when block.number % 15 != 0 (original behavior)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether so a transfer is possible
    const fundAmount = ethers.parseEther("20");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: fundAmount
    });

    // Get current block number and mine until block.number % 15 != 0
    let blockNumber = await ethers.provider.getBlockNumber();
    while (blockNumber % 15 === 0) {
      await ethers.provider.send("evm_mine", []);
      blockNumber = await ethers.provider.getBlockNumber();
    }

    const balanceBefore = await ethers.provider.getBalance(await instance.getAddress());

    // Send 10 ether from addr1 to trigger fallback
    const tx = await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx.wait();

    const balanceAfter = await ethers.provider.getBalance(await instance.getAddress());

    // Original: should NOT transfer because block.number % 15 != 0
    // Mutant: would transfer (changing balance), so this assertion kills the mutant
    expect(balanceAfter).to.equal(balanceBefore);
  });
});