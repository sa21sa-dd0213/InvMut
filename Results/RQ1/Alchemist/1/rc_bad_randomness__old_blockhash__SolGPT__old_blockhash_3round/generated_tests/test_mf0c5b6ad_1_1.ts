import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant mf0c5b6ad test", function () {
  it("should revert when lockInGuess is called without sending 1 ether (mutant removed require)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();

    const randomHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
     
    // On the original contract, calling lockInGuess with 0 ether should revert
    // because the require(msg.value == 1 ether) check is present.
    // On the mutant where that require is removed, it would succeed.
    // Therefore, we expect the transaction to revert on the original,
    // which kills the mutant (mutant would not revert here).
    await expect(
      instance.connect(addr1).lockInGuess(randomHash, { value: 0 })
    ).to.be.reverted;
  });
});