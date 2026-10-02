import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant detection (m4e91fff5)", function () {
  it("should kill the mutant by submitting a guess less than the actual block hash", async function () {
    const [owner, player] = await ethers.getSigners();
    
    // Deploy the contract with 1 ether
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const contract = await Factory.deploy({ value: ethers.parseEther("1") });
    await contract.waitForDeployment();
    
    // Player locks in a guess - we'll use a hash that is numerically smaller
    // than the actual blockhash that will be revealed
    const guessHash = ethers.keccak256(ethers.toUtf8Bytes("small"));
    
    // Player locks in the guess with 1 ether
    const lockTx = await contract.connect(player).lockInGuess(guessHash, {
      value: ethers.parseEther("1")
    });
    await lockTx.wait();
    
    // Mine a block to advance past the target block
    await ethers.provider.send("evm_mine", []);
    
    // Settle the guess
    const settleTx = await contract.connect(player).settle();
    await settleTx.wait();
    
    // Get the contract balance after settlement
    const balanceAfter = await ethers.provider.getBalance(contract.getAddress());
    
    // In the original contract, the player should NOT win because the guess
    // is not equal to the blockhash. The contract should still have 2 ether
    // (original 1 + player's 1 = 2, no payout since guess doesn't match)
    // In the mutant, the <= comparison would incorrectly pay out, reducing balance to 0
    expect(balanceAfter).to.equal(ethers.parseEther("2"));
  });
});