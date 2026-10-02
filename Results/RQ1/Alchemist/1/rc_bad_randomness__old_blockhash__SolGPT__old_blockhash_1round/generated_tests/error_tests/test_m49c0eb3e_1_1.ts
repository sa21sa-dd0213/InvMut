import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant m49c0eb3e test", function () {
  it("should detect the mutant by verifying lockInGuess stores block.number - 1 instead of block.number + 1", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();

    // Lock in a guess
    const guessHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
    const lockTx = await instance.connect(addr1).lockInGuess(guessHash, { value: ethers.parseEther("1") });
    const lockReceipt = await lockTx.wait();
    const lockBlockNumber = lockReceipt.blockNumber;

    // Get the stored block from the contract
    const storedGuess = await instance.guesses(addr1.address);
    const storedBlock = storedGuess.block;

    // In the original, storedBlock should be lockBlockNumber + 1
    // In the mutant, storedBlock should be lockBlockNumber - 1
    // We assert it is lockBlockNumber + 1; the mutant will fail this assertion
    expect(storedBlock).to.equal(lockBlockNumber + 1);
  });
});