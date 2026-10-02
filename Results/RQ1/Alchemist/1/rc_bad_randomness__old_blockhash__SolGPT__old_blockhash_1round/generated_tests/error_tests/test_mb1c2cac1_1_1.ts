import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant detection", function () {
  it("should kill mutant mb1c2cac1 by locking in an incorrect guess and settling when blockhash is non-zero", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy contract with 1 ether
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();

    // Lock in a deliberately wrong guess (all zeros)
    const wrongGuess = ethers.ZeroHash;
    await instance.connect(attacker).lockInGuess(wrongGuess, { value: ethers.parseEther("1") });

    // Mine enough blocks so that block.number > guesses[msg.sender].block
    // The locked block is block.number + 1 at time of lockInGuess
    // We need to mine at least 2 more blocks to satisfy block.number > targetBlock
    await ethers.provider.send("hardhat_mine", ["0x2"]);

    // Now settle - the blockhash should be non-zero (since we're within 256 blocks)
    // In the original: condition is answer != 0 && guess == answer -> both must be true
    // In the mutant: condition is answer != 0 || guess == answer -> only one needs to be true
    // Since guess is wrong but answer is non-zero, mutant will pay out while original would not
    const tx = instance.connect(attacker).settle();

    // The original would revert or not transfer, but mutant transfers 2 ether
    // We expect the transaction to succeed (mutant pays out incorrectly)
    await expect(tx).to.changeEtherBalance(
      attacker,
      ethers.parseEther("2"),
      "Mutant should incorrectly pay out 2 ether when guess is wrong but blockhash is non-zero"
    );
  });
});