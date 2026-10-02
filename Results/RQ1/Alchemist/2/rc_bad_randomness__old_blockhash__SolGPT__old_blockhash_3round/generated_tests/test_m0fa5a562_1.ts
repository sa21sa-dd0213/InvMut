import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge - kill mutant m0fa5a562", function () {
  it("should kill the mutant that replaces keccak256 with sha256", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy with exactly 1 ether
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();
    
    // Attacker locks in a guess, funding with 1 ether
    const lockTx = await instance.connect(attacker).lockInGuess(
      ethers.ZeroHash, // dummy guess, we just need to lock in
      { value: ethers.parseEther("1") }
    );
    await lockTx.wait();
    
    // Mine to the next block so settle can be called
    await ethers.provider.send("evm_mine", []);
    
    // Settle - in original this uses keccak256, in mutant it uses sha256
    // The test will detect the mutant because the transfer will revert or balance won't change
    const attackerBalanceBefore = await ethers.provider.getBalance(attacker.address);
    
    const settleTx = await instance.connect(attacker).settle();
    const receipt = await settleTx.wait();
    
    // If the mutant is present, the answer computed with sha256 won't match
    // the guess (which was computed with keccak256), so no transfer occurs.
    // In the original, the guess was ZeroHash, and blockhash of the previous
    // block keccak256'd won't be ZeroHash, so no transfer either.
    // But we can detect the mutant by checking that the function didn't revert
    // and that no ether was transferred (the contract still has 2 ether).
    const attackerBalanceAfter = await ethers.provider.getBalance(attacker.address);
    
    // The attacker should not have gained 2 ether (the transfer would fail in both cases)
    // But to kill the mutant specifically, we need a scenario where original would succeed
    // and mutant would fail. Let's use a known blockhash.
    
    // Better approach: lock in a guess that equals keccak256(blockhash(lockedBlock))
    // Then in mutant, sha256(blockhash(lockedBlock)) != keccak256(blockhash(lockedBlock))
    // So original succeeds, mutant fails.
    
    // Redo with correct approach
    const Factory2 = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance2 = await Factory2.deploy({ value: ethers.parseEther("1") });
    await instance2.waitForDeployment();
    
    // Lock in a guess at block N
    const lockBlock = await ethers.provider.getBlockNumber();
    const lockTx2 = await instance2.connect(attacker).lockInGuess(
      ethers.ZeroHash,
      { value: ethers.parseEther("1") }
    );
    await lockTx2.wait();
    
    // Mine two blocks so block.number > locked block
    await ethers.provider.send("evm_mine", []);
    await ethers.provider.send("evm_mine", []);
    
    // Now compute what the original would use:
    // The locked block is lockBlock + 1 (since lockInGuess sets block = block.number + 1)
    const lockedBlock = lockBlock + 1;
    const blockHash = await ethers.provider.getStorage(
      await instance2.getAddress(),
      lockedBlock
    );
    // Actually blockhash is not stored, we need to get it via blockhash opcode
    // Use ethers to get the block and its hash
    const block = await ethers.provider.getBlock(lockedBlock);
    const actualBlockHash = block.hash;
    
    // Compute keccak256 hash as original would
    const expectedGuess = ethers.solidityPackedKeccak256(
      ["bytes32"],
      [actualBlockHash]
    );
    
    // We can't re-lock because lock already used, so deploy fresh
    const Factory3 = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance3 = await Factory3.deploy({ value: ethers.parseEther("1") });
    await instance3.waitForDeployment();
    
    // Lock with correct keccak256 guess
    const lockBlock3 = await ethers.provider.getBlockNumber();
    const lockTx3 = await instance3.connect(attacker).lockInGuess(
      expectedGuess,
      { value: ethers.parseEther("1") }
    );
    await lockTx3.wait();
    
    // Mine to pass the locked block
    await ethers.provider.send("evm_mine", []);
    await ethers.provider.send("evm_mine", []);
    
    const balBefore = await ethers.provider.getBalance(attacker.address);
    
    // Settle - in original this should succeed and transfer 2 ether
    // In mutant, sha256 will produce different hash, so no transfer
    await instance3.connect(attacker).settle();
    
    const balAfter = await ethers.provider.getBalance(attacker.address);
    
    // If original, attacker gained 2 ether. If mutant, no gain.
    // This test will fail (kill the mutant) because the balance difference
    // will be less than 2 ether in the mutant version
    expect(balAfter - balBefore).to.be.gt(ethers.parseEther("1.9"));
  });
});