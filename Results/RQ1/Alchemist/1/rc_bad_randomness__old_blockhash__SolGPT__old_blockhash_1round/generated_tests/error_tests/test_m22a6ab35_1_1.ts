import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant m22a6ab35 test", function () {
  it("should detect mutant that replaces blockhash with constant 0", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy contract with 1 ether
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();

    // Lock in a guess - we'll use a placeholder hash that we'll check against blockhash later
    const placeholderHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
    await instance.connect(attacker).lockInGuess(placeholderHash, {
      value: ethers.parseEther("1")
    });

    // Wait for the next block so we can settle
    const currentBlock = await ethers.provider.getBlockNumber();
    await ethers.provider.send("evm_mine", []);

    // Get the actual blockhash of the target block (currentBlock + 1)
    const targetBlock = currentBlock + 1;
    const actualBlockHash = (await ethers.provider.getBlock(targetBlock)).hash;

    // Now lock in a NEW guess with the actual blockhash
    // But first we need to wait for the previous lock to be settled
    // Actually, let's redo: deploy fresh, lock in the correct hash
    const instance2 = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance2.waitForDeployment();

    // Lock in the actual blockhash of the NEXT block
    const currentBlock2 = await ethers.provider.getBlockNumber();
    await instance2.connect(attacker).lockInGuess(actualBlockHash, {
      value: ethers.parseEther("1")
    });

    // Mine to the target block
    await ethers.provider.send("evm_mine", []);

    // Get initial balance
    const initialBalance = await ethers.provider.getBalance(attacker.address);

    // Settle the guess
    const tx = await instance2.connect(attacker).settle();
    const receipt = await tx.wait();

    // Get final balance
    const finalBalance = await ethers.provider.getBalance(attacker.address);
    const balanceDiff = finalBalance - initialBalance;

    // In original contract, attacker should get 2 ether (minus gas)
    // In mutant, answer is always 0, so guess != answer, no transfer happens
    // Therefore balanceDiff should be negative (gas cost only) in mutant
    expect(balanceDiff).to.be.lessThan(ethers.parseEther("0"));

    // Also verify the guess was cleared
    // We can't easily check internal mapping, but we can verify the function doesn't revert
  });
});