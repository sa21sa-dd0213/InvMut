import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant detection", function () {
  it("should detect the mutant that changes != to == in settle require statement", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();

    // Lock in a guess
    const dummyHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
    await instance.connect(addr1).lockInGuess(dummyHash, { value: ethers.parseEther("1") });

    // Advance to next block so we can settle
    await ethers.provider.send("evm_mine", []);

    // This should succeed on original (block != 0) but revert on mutant (block == 0)
    await expect(
      instance.connect(addr1).settle()
    ).to.not.be.reverted;
  });
});