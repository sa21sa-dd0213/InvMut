import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant m49c0eb3e test", function () {
  it("should kill the mutant by settling with a past blockhash", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy with 1 ether as required by constructor
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();
    
    // Get current block number
    const currentBlock = await ethers.provider.getBlockNumber();
    
    // The mutant sets guesses[msg.sender].block = block.number - 1
    // So if we lock in at block N, the target block will be N-1 (a past block)
    // Get the blockhash of the block just before the current one
    const pastBlockHash = (await ethers.provider.getBlock(currentBlock - 1)).hash;
    
    // Lock in a guess with the known past blockhash
    // We need to provide 1 ether as msg.value
    const lockTx = await instance.connect(attacker).lockInGuess(
      ethers.keccak256(ethers.toUtf8Bytes(pastBlockHash)),
      { value: ethers.parseEther("1") }
    );
    await lockTx.wait();
    
    // Now the locked block is currentBlock - 1 (due to mutation)
    // We can immediately settle since block.number > (block.number - 1)
    // The answer will be blockhash(block.number - 1) which we already know
    const settleTx = await instance.connect(attacker).settle();
    await settleTx.wait();
    
    // Check that attacker received 2 ether
    const attackerBalance = await ethers.provider.getBalance(attacker.address);
    // Attacker spent 1 ether to lock in, should have gained 2 ether net +1
    expect(attackerBalance).to.be.gt(ethers.parseEther("10000")); // Initial balance is ~10000 ETH
  });
});