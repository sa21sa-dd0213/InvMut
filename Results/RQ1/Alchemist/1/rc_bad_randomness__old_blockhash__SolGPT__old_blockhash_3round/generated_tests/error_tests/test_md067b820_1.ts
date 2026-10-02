import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant kill test (md067b820)", function () {
  it("should kill the mutant by submitting a guess larger than the actual block hash and verifying no reward", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy with 1 ether
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();

    // Attacker locks in a guess with 1 ether
    // We'll guess a hash that is larger than the actual blockhash will be
    // The actual blockhash for block N will be some 32-byte value
    // We use bytes32 max value (all F's) to ensure it's >= any real blockhash
    const largeGuess = ethers.keccak256(ethers.toUtf8Bytes("large_guess_to_kill_mutant"));
    // But to be safe, we use the maximum possible bytes32 value
    const maxBytes32 = "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
    
    await instance.connect(attacker).lockInGuess(maxBytes32, { value: ethers.parseEther("1") });

    // Get the target block number from the contract
    const guessData = await instance.guesses(attacker.address);
    const targetBlock = guessData.block;
    
    // Mine blocks to pass the target block
    const currentBlock = await ethers.provider.getBlockNumber();
    if (currentBlock <= targetBlock) {
      const blocksToMine = targetBlock - currentBlock + 1;
      for (let i = 0; i < blocksToMine; i++) {
        await ethers.provider.send("evm_mine", []);
      }
    }

    // Get the actual blockhash of the target block
    const actualBlockHash = await ethers.provider.getStorage(
      targetBlock,
      "0x0"
    );
    // Actually we need blockhash, use ethers
    const blockHash = await ethers.provider.getBlock(targetBlock);
    const actualHash = blockHash.hash;

    // Now settle - attacker's guess (max bytes32) should be >= actual blockhash
    // In original, this would revert or not transfer because !=
    // In mutant, this would succeed and transfer 2 ether
    
    // Get attacker balance before
    const balanceBefore = await ethers.provider.getBalance(attacker.address);
    
    // Call settle
    const tx = await instance.connect(attacker).settle();
    const receipt = await tx.wait();
    
    // Get attacker balance after
    const balanceAfter = await ethers.provider.getBalance(attacker.address);
    
    // In original contract, no transfer happens (guess != actual hash)
    // In mutant, transfer of 2 ether would happen (guess >= actual hash)
    // So we assert balance did NOT increase by 2 ether (minus gas)
    const balanceDiff = balanceAfter - balanceBefore;
    
    // The mutant would transfer 2 ether, so balanceDiff would be ~2 ether
    // The original does NOT transfer, so balanceDiff would be negative (gas cost only)
    expect(balanceDiff).to.be.lessThan(ethers.parseEther("1"));
    // If the mutant transfers, balanceDiff would be positive and large (~2 ether)
  });
});