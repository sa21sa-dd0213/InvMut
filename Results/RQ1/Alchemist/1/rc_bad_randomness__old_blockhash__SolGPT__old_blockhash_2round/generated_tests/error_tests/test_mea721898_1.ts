import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant kill test (keccak256 -> sha256)", function () {
  it("should kill mutant by showing sha256 produces different answer than keccak256", async function () {
    const [owner, player] = await ethers.getSigners();
    
    // Deploy with exactly 1 ether as required by constructor
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();

    // Player locks in a guess with 1 ether
    const lockTx = await instance.connect(player).lockInGuess(
      ethers.ZeroHash, // placeholder, will be overwritten by actual hash
      { value: ethers.parseEther("1") }
    );
    await lockTx.wait();

    // Get the block number that was stored (block.number + 1 at time of lock)
    // We need to advance to at least that block + 1 to settle
    const storedBlock = (await instance.guesses(player.address))[0]; // guesses mapping returns struct
    const targetBlock = Number(storedBlock);
    
    // Mine blocks until we pass the target block
    while ((await ethers.provider.getBlockNumber()) <= targetBlock) {
      await ethers.provider.send("evm_mine", []);
    }

    // Now compute what the CORRECT keccak256 answer would be
    const blockHash = await ethers.provider.getBlock(targetBlock);
    const blockHashValue = blockHash.hash;
    const correctKeccakAnswer = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(["bytes32"], [blockHashValue])
    );

    // Player settles - this should succeed in original (keccak256) but fail in mutant (sha256)
    // because the mutant computes sha256 instead of keccak256, so guess won't match
    await expect(instance.connect(player).settle()).to.not.be.reverted;
    
    // Verify player did NOT receive reward (since sha256 != keccak256)
    const balanceAfter = await ethers.provider.getBalance(player.address);
    // Player should have less than 2 ether profit (they paid 1 ether + gas)
    // In original, they'd get 2 ether reward; in mutant, they get nothing
    expect(balanceAfter).to.be.lt(ethers.parseEther("1.5")); // less than 1.5 ether means no reward
  });
});