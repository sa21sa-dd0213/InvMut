import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant m070bd35b test", function () {
  it("should revert on first lockInGuess call for a fresh address because mutant requires existing guess", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();

    // addr1 has never locked in a guess, so guesses[addr1].block == 0
    // Original contract: require(guesses[msg.sender].block == 0) -> passes
    // Mutant: require(guesses[msg.sender].block != 0) -> fails (reverts)
    const randomHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
    await expect(
      instance.connect(addr1).lockInGuess(randomHash, { value: ethers.parseEther("1") })
    ).to.be.reverted;
  });
});