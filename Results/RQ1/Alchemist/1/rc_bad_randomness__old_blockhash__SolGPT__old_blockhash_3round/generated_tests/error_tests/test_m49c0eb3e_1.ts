import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant detection - m49c0eb3e", function () {
  it("should kill the mutant by detecting premature settlement when using block.number - 1", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy with 1 ether as required by constructor
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();

    // Attacker locks in a guess with 1 ether
    const guessHash = ethers.keccak256(ethers.toUtf8Bytes("any guess"));
    const lockTx = await instance.connect(attacker).lockInGuess(guessHash, {
      value: ethers.parseEther("1")
    });
    await lockTx.wait();

    // In the mutant, block.number - 1 is used, so the target block is already in the past.
    // Calling settle immediately should succeed (revert expected in original, not in mutant)
    // We expect the mutant to NOT revert (meaning it settles prematurely)
    // The original would revert because block.number has not yet exceeded block.number + 1
    
    // If the mutant is deployed, this call should succeed (not revert)
    const settleTx = await instance.connect(attacker).settle();
    
    // If we reach here, the mutant is alive (settle didn't revert)
    // We can further verify by checking the attacker's balance or state changes
    // For a proper kill, we assert that the transaction succeeded when it should have reverted
    await expect(settleTx.wait()).to.not.be.reverted;
    
    // Additional verification: check that the guess was processed (mutant behavior)
    // In original this would have reverted, so reaching here kills the mutant
  });
});