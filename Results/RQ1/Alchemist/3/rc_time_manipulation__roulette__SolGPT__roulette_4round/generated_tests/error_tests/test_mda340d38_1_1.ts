import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant mda340d38 test", function () {
  it("should not payout when block number is not divisible by 15", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const contractAddress = await instance.getAddress();

    // Mine to a block where block.number % 15 != 0
    while (true) {
      const currentBlock = await ethers.provider.getBlockNumber();
      if (currentBlock % 15 !== 0) {
        break;
      }
      await ethers.provider.send("evm_mine", []);
    }

    // Get initial balances
    const initialBalance = await ethers.provider.getBalance(contractAddress);
    const senderBalanceBefore = await ethers.provider.getBalance(addr1.address);

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
    const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
    const gasCost = receipt.gasUsed * receipt.effectiveGasPrice;
    expect(senderBalanceAfter).to.equal(senderBalanceBefore - ethers.parseEther("10") - gasCost);
  });
});