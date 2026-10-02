import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant mc4c6acff detection test", function () {
  it("should detect mutant by checking payout at block.number % 15 == 0", async function () {
    const [owner, player] = await ethers.getSigners();

    // Deploy the contract (constructor is payable but takes no arguments)
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get the current block number to calculate when next multiple of 15 occurs
    let currentBlock = await ethers.provider.getBlockNumber();
    const blocksUntilMultiple = (15 - (currentBlock % 15)) % 15;

    // Mine blocks until we reach a block where block.number % 15 == 0
    for (let i = 0; i < blocksUntilMultiple; i++) {
      await ethers.provider.send("evm_mine", []);
    }

    // Verify we're at a multiple of 15
    const targetBlock = await ethers.provider.getBlockNumber();
    expect(targetBlock % 15).to.equal(0, "Setup failed: block number should be multiple of 15");

    // Record player's balance before
    const balanceBefore = await ethers.provider.getBalance(player.address);

    // Player sends exactly 10 ether to trigger fallback
    const tx = await player.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx.wait();

    // Check player's balance after
    const balanceAfter = await ethers.provider.getBalance(player.address);
    const balanceDifference = balanceAfter - balanceBefore;

    // In the original contract, the payout should have occurred (balance should increase)
    // In the mutant, payout occurs at block.number % 15 == 1, so no payout here
    // The gas cost is subtracted, but the payout of contract balance should exceed it
    // Since contract only had 10 ether, payout should be ~10 ether minus gas
    // A significant positive balance change indicates payout occurred
    expect(balanceDifference).to.be.gt(0, "Payout should have occurred at block multiple of 15");

    // Additional check: verify the contract balance decreased (payout happened)
    const contractBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(contractBalance).to.equal(0, "Contract should have zero balance after payout");
  });
});