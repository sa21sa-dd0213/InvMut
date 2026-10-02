import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant test", function () {
  it("should kill mutant mc70f3ddf by sending 1 ether to lockInGuess and expecting success", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();

    const hash = ethers.keccak256(ethers.toUtf8Bytes("test"));
    const tx = instance.lockInGuess(hash, { value: ethers.parseEther("1") });
    await expect(tx).to.not.be.reverted;
  });
});