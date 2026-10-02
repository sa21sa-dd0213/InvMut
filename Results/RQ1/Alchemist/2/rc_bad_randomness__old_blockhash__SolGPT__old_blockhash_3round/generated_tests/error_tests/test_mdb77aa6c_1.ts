import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant test - kill mdb77aa6c", function () {
  it("should transfer 2 ether when correct block hash is guessed, but mutant will fail", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy contract with 1 ether
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();
    
    // Get current block number
    const currentBlock = await ethers.provider.getBlockNumber();
    
    // The guess must be for block.number + 1
    const targetBlockNumber = currentBlock + 1;
    
    // Lock in the guess with 1 ether
    // We'll guess the hash of block targetBlockNumber (which we don't know yet)
    // To make the correct guess, we need to know the future block hash
    // We'll mine the block first, then compute its hash, then lock in the guess
    // But the contract requires lockInGuess before the block is mined
    // Solution: mine the target block, get its hash, then deploy a new contract
    // and use that hash as the guess, but we need to predict it before mining
    
    // Actually, we can mine a block, get its hash, then deploy a new contract
    // and lock in that hash for the next block (which will be different)
    // Better approach: use a different strategy
    
    // Mine a block to get a known hash
    await ethers.provider.send("evm_mine", []);
    const knownBlock = await ethers.provider.getBlock("latest");
    const knownHash = knownBlock!.hash;
    
    // Deploy a new contract with fresh state
    const Factory2 = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance2 = await Factory2.deploy({ value: ethers.parseEther("1") });
    await instance2.waitForDeployment();
    
    // Lock in the guess with the known hash
    await instance2.connect(addr1).lockInGuess(knownHash, { value: ethers.parseEther("1") });
    
    // Get the block where the guess was locked
    const lockBlock = await ethers.provider.getBlockNumber();
    
    // Mine blocks until block.number > lockBlock + 1
    while ((await ethers.provider.getBlockNumber()) <= lockBlock + 1) {
      await ethers.provider.send("evm_mine", []);
    }
    
    // Now the target block (lockBlock + 1) is in the past, we can get its hash
    const targetBlock = await ethers.provider.getBlock(lockBlock + 1);
    const targetHash = targetBlock!.hash;
    
    // The original contract would compute answer = keccak256(abi.encodePacked(blockhash(lockBlock + 1)))
    // which equals keccak256(abi.encodePacked(targetHash))
    // Our guess is knownHash, which should equal targetHash for the test to pass
    
    // If knownHash == targetHash, the original contract would pay 2 ether
    // The mutant computes answer = keccak256(abi.encodePacked(blockhash(block.prevrandao)))
    // which will be different, so the mutant will not pay
    
    // We need to ensure knownHash == targetHash
    // This requires the block we mined earlier to have the same hash as the block
    // at lockBlock + 1, which is impossible to guarantee in general
    
    // Alternative simpler approach: test with a wrong guess
    // The original will not pay, the mutant also won't pay - not useful
    
    // Correct approach: use a scenario where the original would pay
    // We need to predict the hash of the next block
    
    // Since block hash depends on block content, we can force a specific hash
    // by mining empty blocks - but hash is still unpredictable
    
    // For testing purposes, we can check the balance after settle
    // In the original, if guess matches, balance increases by 2 ether
    // In the mutant, balance never increases because block.prevrandao is used
    
    // Simple deterministic test: deploy, lock in any guess, settle
    // Original: guess won't match (since we don't know future block hash)
    // Mutant: guess won't match either (different hash)
    
    // Better: deploy, lock in a guess, then check that settle doesn't revert
    // and check that balance didn't change (because guess was wrong)
    // This tests that the function executes without revert in both versions
    
    // The key difference: in the original, if we could guess correctly,
    // the transfer would happen. In the mutant, it never happens.
    
    // We can't easily guess correctly, but we can verify the mutant behavior
    // by checking that settle doesn't throw and balances are correct
    
    // Let's use a simpler approach: test that settle executes without error
    // and check addr1 balance after
    
    const balanceBefore = await ethers.provider.getBalance(addr1.address);
    
    // Lock in a random guess
    const randomGuess = ethers.keccak256(ethers.toUtf8Bytes("test"));
    await instance2.connect(addr1).lockInGuess(randomGuess, { value: ethers.parseEther("1") });
    
    // Get the block where guess was locked
    const guessBlock = await ethers.provider.getBlockNumber();
    
    // Mine past the target block
    while ((await ethers.provider.getBlockNumber()) <= guessBlock + 1) {
      await ethers.provider.send("evm_mine", []);
    }
    
    // Call settle
    await instance2.connect(addr1).settle();
    
    const balanceAfter = await ethers.provider.getBalance(addr1.address);
    
    // In the original contract, the guess won't match (random hash)
    // so no transfer happens. Same for mutant.
    // This test doesn't kill the mutant because both behave the same.
    
    // We need a test that distinguishes them. The only way is if
    // we could make a correct guess. But we can't predict block hash.
    
    // However, we can exploit that blockhash returns bytes32(0) for
    // blocks older than 256 blocks. If we wait 256+ blocks, blockhash
    // returns 0. Then keccak256(abi.encodePacked(0)) is predictable.
    
    // Strategy: lock in a guess of keccak256(abi.encodePacked(bytes32(0)))
    // Wait 256+ blocks, then settle. Original will compute answer using
    // blockhash which returns 0, so answer = keccak256(0) = our guess.
    // Mutant uses block.prevrandao which is not 0, so answer differs.
    
    const zeroHash = "0x0000000000000000000000000000000000000000000000000000000000000000";
    const expectedAnswer = ethers.keccak256(ethers.concat(["0x", zeroHash.slice(2)]));
    
    // Deploy a fresh contract
    const Factory3 = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance3 = await Factory3.deploy({ value: ethers.parseEther("1") });
    await instance3.waitForDeployment();
    
    // Lock in the guess of keccak256(0)
    await instance3.connect(addr1).lockInGuess(expectedAnswer, { value: ethers.parseEther("1") });
    
    // Get the target block number
    const targetBlockNum = await ethers.provider.getBlockNumber();
    
    // Mine 257 blocks to make blockhash return 0
    for (let i = 0; i < 257; i++) {
      await ethers.provider.send("evm_mine", []);
    }
    
    const balanceBeforeSettle = await ethers.provider.getBalance(addr1.address);
    
    // Settle - original should pay 2 ether, mutant should not
    await instance3.connect(addr1).settle();
    
    const balanceAfterSettle = await ethers.provider.getBalance(addr1.address);
    
    // In the original contract, this would increase by 2 ether
    // In the mutant, it stays the same (minus gas)
    // This test kills the mutant because:
    // - Original: balanceAfterSettle - balanceBeforeSettle = 2 ether (approx, minus gas)
    // - Mutant: balanceAfterSettle - balanceBeforeSettle ≈ 0 (minus gas)
    
    // We assert that the balance increased (this will fail on mutant)
    expect(balanceAfterSettle).to.be.gt(balanceBeforeSettle);
  });
});