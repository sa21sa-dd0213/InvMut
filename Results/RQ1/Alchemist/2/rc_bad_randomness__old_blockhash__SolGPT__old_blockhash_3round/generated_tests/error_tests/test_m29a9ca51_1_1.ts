import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant m29a9ca51 detection", function () {
  it("should detect mutant by verifying incorrect guess does not receive reward", async function () {
    const [owner, player] = await ethers.getSigners();

    // Deploy contract with 1 ether
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();

    // Player locks in an arbitrary incorrect guess
    const incorrectHash = ethers.keccak256(ethers.toUtf8Bytes("wrong_guess"));
    const lockTx = await instance.connect(player).lockInGuess(incorrectHash, {
      value: ethers.parseEther("1")
    });
    await lockTx.wait();

    // Wait for the target block to pass (block.number + 1)
    const targetBlock = (await ethers.provider.getBlock("latest")).number + 1;
    await ethers.provider.send("hardhat_mine", [ethers.toQuantity(2)]); // mine 2 blocks to pass target

    // Record player's balance before settle
    const balanceBefore = await ethers.provider.getBalance(player.address);

    // Attempt to settle - in original contract this would revert or not transfer
    // In mutant it incorrectly transfers 2 ether
    const settleTx = await instance.connect(player).settle();
    await settleTx.wait();

    // Check balance - in original, no transfer should occur
    const balanceAfter = await ethers.provider.getBalance(player.address);

    // Calculate gas costs (approximate)
    const receipt = await ethers.provider.getTransactionReceipt(settleTx.hash);
    const gasCost = receipt.gasUsed * receipt.effectiveGasPrice;

    // In original: balanceAfter should be balanceBefore - gasCost (no transfer)
    // In mutant: balanceAfter should be balanceBefore - gasCost + 2 ether
    // We expect the original behavior (no reward for incorrect guess)
    expect(balanceAfter).to.be.closeTo(balanceBefore - gasCost, ethers.parseEther("0.01"));

    // Alternative check: verify the contract balance is still 2 ether (1 original + 1 from player)
    const contractBalance = await ethers.provider.getBalance(instance.target);
    expect(contractBalance).to.equal(ethers.parseEther("2"));
  });
});