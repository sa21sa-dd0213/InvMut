import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m6d1f8efd - replace % with /", function () {
  it("should kill mutant when block.number is a multiple of 15", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some initial balance
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // Get current block number and calculate the next multiple of 15
    let currentBlock = await ethers.provider.getBlockNumber();
    let targetBlock = currentBlock + (15 - (currentBlock % 15));

    // Mine blocks to reach a block that is a multiple of 15
    while ((await ethers.provider.getBlockNumber()) < targetBlock) {
      await ethers.provider.send("evm_mine", []);
    }

    // Verify we are at a multiple of 15
    const blockBefore = await ethers.provider.getBlock("latest");
    expect(blockBefore.number % 15).to.equal(0);

    // Call fallback with 10 ether - this should trigger the transfer in original
    const initialContractBalance = await ethers.provider.getBalance(await instance.getAddress());
    const initialOwnerBalance = await ethers.provider.getBalance(owner.address);
    
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10"),
      gasLimit: 100000
    });

    const finalContractBalance = await ethers.provider.getBalance(await instance.getAddress());
    
    // In original, contract balance would be 0 (transferred all to sender)
    // In mutant, contract balance would be 20 ether (no transfer happened)
    expect(finalContractBalance).to.equal(0);
  });
});