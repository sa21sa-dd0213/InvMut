import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant m6ef09236", function () {
  it("should kill mutant by settling exactly one block after lock-in", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();

    // Lock in a guess with 1 ether
    const guessHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
    await instance.connect(addr1).lockInGuess(guessHash, { value: ethers.parseEther("1") });

    // Mine one additional block
    await ethers.provider.send("evm_mine", []);

    // Get current block number to verify condition
    const currentBlock = await ethers.provider.getBlockNumber();
    const guess = await instance.guesses(addr1.address);
    expect(currentBlock).to.equal(Number(guess.block) + 1);

    // Settle - should succeed on original but fail on mutant
    await expect(instance.connect(addr1).settle()).to.be.reverted;
  });
});