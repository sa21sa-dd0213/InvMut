import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant detection - m32349c6a", function () {
  it("should kill mutant by verifying payout only when block.number % 15 == 0", async function () {
    const [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const contractAddress = await instance.getAddress();

    // Get current block number
    let currentBlock = await ethers.provider.getBlock("latest");
    let currentBlockNumber = currentBlock!.number;

    // Calculate blocks needed to reach a block where block.number % 15 == 0
    const blocksUntilMultiple = (15 - (currentBlockNumber % 15)) % 15;

    // Mine blocks to reach the target block
    if (blocksUntilMultiple > 0) {
      for (let i = 0; i < blocksUntilMultiple; i++) {
        await ethers.provider.send("evm_mine", []);
      }
    }

    // Verify we are at a multiple of 15
    currentBlock = await ethers.provider.getBlock("latest");
    expect(currentBlock!.number % 15).to.equal(0);

    // Get initial balance of user
    const initialBalance = await ethers.provider.getBalance(user.address);
    const initialContractBalance = await ethers.provider.getBalance(contractAddress);

    // Send exactly 10 ether to trigger fallback
    const tx = await user.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther("10")
    });
    await tx.wait();

    // Get balances after transaction
    const finalBalance = await ethers.provider.getBalance(user.address);
    const finalContractBalance = await ethers.provider.getBalance(contractAddress);

    // On original: contract sends full balance to caller, so contract balance becomes 0
    // and user receives the contract's previous balance (which was 0 + 10 sent = 10 ether)
    // On mutant: condition is != 0, so at block % 15 == 0, no payout occurs
    // Contract retains the 10 ether, user loses 10 ether (minus gas)

    // The key assertion: contract balance should be 0 on original (payout occurred)
    // But on mutant, contract balance will still be 10 ether (payout did not occur)
    expect(finalContractBalance).to.equal(0);

    // Also verify user received the payout (original behavior)
    // User sent 10 ether but received contract balance (which was 10 ether after their deposit)
    // Net effect: user should have approximately initialBalance - gas costs
    // But definitely more than initialBalance - 10 ether (which is what would happen if no payout)
    expect(finalBalance).to.be.gt(initialBalance - ethers.parseEther("10"));
  });
});