import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant detection", function () {
  it("should kill mutant me2aea32c by sending exactly 1 ether and expecting success", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();

    // Lock in a guess with exactly 1 ether - should succeed on original, revert on mutant
    const dummyHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
    const tx = instance.connect(addr1).lockInGuess(dummyHash, {
      value: ethers.parseEther("1")
    });

    // The mutant requires msg.value != 1 ether, so sending exactly 1 ether will revert
    await expect(tx).to.be.reverted;
  });
});