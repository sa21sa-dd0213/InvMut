import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant mba599e32", function () {
  it("should allow lockInGuess with msg.value less than 1 ether (mutant accepts <= 1 ether)", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();

    // Send only 0.5 ether - mutant should accept it (<= 1 ether), original would revert
    const guessHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
    await expect(
      instance.connect(player).lockInGuess(guessHash, { value: ethers.parseEther("0.5") })
    ).to.not.be.reverted;
  });
});