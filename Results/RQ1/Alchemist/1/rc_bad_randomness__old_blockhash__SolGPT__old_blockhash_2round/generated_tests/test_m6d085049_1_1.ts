import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant detection", function () {
  it("should kill mutant m6d085049 by sending 1 ether to lockInGuess, which reverts on mutant but passes on original", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();

    // Attempt to lock in a guess by sending exactly 1 ether
    // On original contract: require(msg.value == 1 ether) passes
    // On mutant: require(msg.value + 1 == 1 ether) => require(1 ether + 1 == 1 ether) => require(1 ether + 1 wei == 1 ether) fails
    const dummyHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
    const tx = instance.connect(owner).lockInGuess(dummyHash, { value: ethers.parseEther("1") });

    // The transaction should revert because the mutant's condition fails when sending 1 ether
    await expect(tx).to.be.reverted;
  });
});