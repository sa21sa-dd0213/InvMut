import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant detection", function () {
  it("should kill mutant m491ea3c5 by detecting hardcoded zero blockhash", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy contract with 1 ether
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();

    // Attacker locks in the constant hash that the mutant would always use
    // keccak256(abi.encodePacked(0)) which is keccak256 of 32 zero bytes
    const zeroBytes = "0x" + "00".repeat(32);
    const expectedHash = ethers.keccak256(zeroBytes);

    // Lock in guess with 1 ether
    await instance.connect(attacker).lockInGuess(expectedHash, { value: ethers.parseEther("1") });

    // Mine blocks until the target block is in the past
    const currentBlock = await ethers.provider.getBlockNumber();
    const targetBlock = currentBlock + 1;
    // Wait for at least targetBlock + 1 to pass
    while ((await ethers.provider.getBlockNumber()) <= targetBlock) {
      await ethers.provider.send("evm_mine", []);
    }

    // Get the actual blockhash for the target block
    const actualBlockHash = (await ethers.provider.getBlock(targetBlock)).hash;
    const actualAnswer = ethers.keccak256(actualBlockHash);

    // On original: answer would be actualAnswer (almost certainly != expectedHash), so settle would NOT transfer 2 ether
    // On mutant: answer is always expectedHash, so settle WOULD transfer 2 ether

    // Record attacker's balance before settle
    const balanceBefore = await ethers.provider.getBalance(attacker.address);

    // Execute settle
    const tx = await instance.connect(attacker).settle();
    const receipt = await tx.wait();

    // Check balance after settle
    const balanceAfter = await ethers.provider.getBalance(attacker.address);
    const balanceChange = balanceAfter - balanceBefore;

    // If mutant is present, attacker received 2 ether (minus gas costs)
    // If original, attacker did NOT receive 2 ether
    // The test kills the mutant by checking that the balance change is NOT approximately 2 ether
    // (i.e., the original behavior - no transfer occurred)
    expect(balanceChange).to.be.lessThan(ethers.parseEther("1.9")); // Not 2 ether transfer
  });
});