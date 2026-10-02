import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant m9bd134d0", function () {
  it("should kill the mutant by verifying correct block hash is used", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();

    // Lock in a guess for the next block
    const guessHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
    await instance.connect(owner).lockInGuess(guessHash, { value: ethers.parseEther("1") });

    // Mine one block so block.number > stored block
    await ethers.provider.send("evm_mine", []);

    // Get the block number when lockInGuess was called (current block at that time)
    const lockBlock = await ethers.provider.getBlockNumber() - 1; // block before the mined one

    // Compute the expected answer for the original contract: hash of block lockBlock + 1
    const originalBlockHash = (await ethers.provider.getBlock(lockBlock + 1)).hash;
    const originalAnswer = ethers.keccak256(originalBlockHash);

    // Compute the expected answer for the mutant: hash of block lockBlock (since mutant uses block.number)
    const mutantBlockHash = (await ethers.provider.getBlock(lockBlock)).hash;
    const mutantAnswer = ethers.keccak256(mutantBlockHash);

    // The mutant will use mutantAnswer, but the test expects originalAnswer
    // If the guess matches originalAnswer, the original contract would succeed
    // The mutant will fail because it compares guessHash to mutantAnswer (different)
    // We set guessHash to the originalAnswer to pass on original, but mutant will revert
    await instance.connect(owner).lockInGuess(originalAnswer, { value: ethers.parseEther("1") });
    await ethers.provider.send("evm_mine", []);

    // Settle - original would succeed, mutant should revert or not transfer
    await expect(instance.connect(owner).settle()).to.be.reverted;
  });
});