import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant detection - m32349c6a", function () {
  it("should kill mutant by proving payout only happens on block % 15 == 0", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send exactly 10 ether to the contract
    const tx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx.wait();

    // Check the contract balance after the transaction
    const contractBalance = await ethers.provider.getBalance(
      await instance.getAddress()
    );

    // Get the block number of the transaction
    const receipt = await tx.getBlock();
    const blockNumber = receipt.number;

    // If block % 15 == 0, the payout should have occurred (balance = 0)
    // If block % 15 != 0, the payout should NOT occur (balance = 10 ether)
    if (blockNumber % 15n === 0n) {
      // Original contract: payout happens => balance = 0
      // Mutant: payout does NOT happen (condition != 0 is false) => balance = 10 ether
      expect(contractBalance).to.equal(0n);
    } else {
      // Original contract: no payout => balance = 10 ether
      // Mutant: payout happens (condition != 0 is true) => balance = 0
      expect(contractBalance).to.equal(ethers.parseEther("10"));
    }
  });
});