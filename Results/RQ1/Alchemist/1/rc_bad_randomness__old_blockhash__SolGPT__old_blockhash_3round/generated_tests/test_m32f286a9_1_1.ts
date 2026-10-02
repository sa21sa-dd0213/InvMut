import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant m32f286a9 test", function () {
  it("should revert when settling in the same block as locking the guess (original behavior)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();

    // Lock in a guess with 1 ether
    const guessHash = ethers.keccak256(ethers.toUtf8Bytes("any guess"));
    await instance.connect(owner).lockInGuess(guessHash, { value: ethers.parseEther("1") });

    // Attempt to settle in the same block - should revert in the original
    // because block.number is not > guesses[owner].block yet
    await expect(instance.connect(owner).settle()).to.be.reverted;
  });
});