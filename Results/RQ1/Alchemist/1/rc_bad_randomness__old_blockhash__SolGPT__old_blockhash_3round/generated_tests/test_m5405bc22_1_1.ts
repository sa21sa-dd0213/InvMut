import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant m5405bc22 test", function () {
  it("should revert when settling in the same block as the guess (mutant allows it)", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();

    // Player locks in a guess
    const dummyHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
    await instance.connect(player).lockInGuess(dummyHash, { value: ethers.parseEther("1") });

    // Attempt to settle in the same block (without mining an additional block)
    // The original contract reverts because block.number is not > guesses[msg.sender].block
    // The mutant incorrectly allows it due to block.number+1 > guesses[msg.sender].block
    await expect(
      instance.connect(player).settle()
    ).to.be.reverted;
  });
});