import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant test", function () {
  it("should allow first-time lockInGuess and detect mutant that requires prior guess", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();

    // addr1 calls lockInGuess for the first time (should succeed in original)
    const hashToLock = ethers.keccak256(ethers.toUtf8Bytes("test"));
    
    // This should succeed in original but revert in mutant because mutant requires guesses[msg.sender].block != 0
    await expect(
      instance.connect(addr1).lockInGuess(hashToLock, { value: ethers.parseEther("1") })
    ).to.not.be.reverted;
  });
});