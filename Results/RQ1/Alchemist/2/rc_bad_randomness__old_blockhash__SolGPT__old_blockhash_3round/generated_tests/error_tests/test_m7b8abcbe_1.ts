import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant test - m7b8abcbe", function () {
  it("should detect removal of duplicate lockInGuess check by allowing second call that should have reverted", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();

    // First lockInGuess call - should succeed
    const hash1 = ethers.keccak256(ethers.toUtf8Bytes("guess1"));
    await instance.connect(addr1).lockInGuess(hash1, { value: ethers.parseEther("1") });

    // Second lockInGuess call from same address - in original contract this would revert
    // In the mutant, the require(guesses[msg.sender].block == 0) is removed, so it should succeed
    const hash2 = ethers.keccak256(ethers.toUtf8Bytes("guess2"));
    await expect(
      instance.connect(addr1).lockInGuess(hash2, { value: ethers.parseEther("1") })
    ).to.not.be.reverted;

    // Verify the guess was overwritten by calling settle and checking if second guess was used
    // Mine blocks to satisfy block.number > guesses[msg.sender].block
    await ethers.provider.send("evm_mine");
    
    // The settle should succeed (not revert) because the mutant allows the second lockInGuess
    await expect(instance.connect(addr1).settle()).to.not.be.reverted;
  });
});