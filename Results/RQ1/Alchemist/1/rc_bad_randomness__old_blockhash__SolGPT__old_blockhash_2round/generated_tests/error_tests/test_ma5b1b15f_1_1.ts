import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant ma5b1b15f", function () {
  it("should detect removal of block.number > guesses[msg.sender].block check", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy contract with 1 ether
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();
    
    // Attacker locks in guess of bytes32(0) with 1 ether
    const lockTx = await instance.connect(attacker).lockInGuess(
      ethers.ZeroHash,
      { value: ethers.parseEther("1") }
    );
    await lockTx.wait();
    
    // Immediately settle in the same block (before target block is reached)
    // In the original contract, this should revert due to block.number > guesses[msg.sender].block check
    // In the mutant, this check is removed, so it will proceed and blockhash will return 0
    // making the guess (0) match the answer (0), allowing theft of ether
    const settleTx = await instance.connect(attacker).settle();
    
    // If the mutant is present, the transaction should succeed
    await expect(settleTx).to.not.be.reverted;
    
    // Verify the attacker received 2 ether (their original 1 + 1 from contract)
    const attackerBalance = await ethers.provider.getBalance(attacker.address);
    expect(attackerBalance).to.be.gt(ethers.parseEther("10000")); // initial balance + 2 ether
  });
});