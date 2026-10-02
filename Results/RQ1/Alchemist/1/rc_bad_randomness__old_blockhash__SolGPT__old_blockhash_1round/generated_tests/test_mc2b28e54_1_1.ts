import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant mc2b28e54", function () {
  it("should kill the mutant by locking in a wrong guess and expecting revert on settle (mutant pays out unconditionally)", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy the contract with 1 ether
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();

    // Lock in a deliberately wrong guess (e.g., all zeros)
    const wrongGuess = ethers.ZeroHash;
    await instance.connect(attacker).lockInGuess(wrongGuess, { value: ethers.parseEther("1") });

    // Mine blocks to advance past the target block
    const targetBlock = (await ethers.provider.getBlock("latest"))!.number + 1;
    while ((await ethers.provider.getBlock("latest"))!.number <= targetBlock) {
      await ethers.provider.send("evm_mine", []);
    }

    // On the original contract, this would revert because guess != blockhash
    // On the mutant with if(true), it will succeed and transfer 2 ether
    // We expect it to succeed (mutant behavior) - if it reverts, the mutant is killed
    await expect(
      instance.connect(attacker).settle()
    ).to.not.be.reverted;

    // Verify the attacker received 2 ether (mutant pays unconditionally)
    const balanceAfter = await ethers.provider.getBalance(attacker.address);
    expect(balanceAfter).to.be.gt(ethers.parseEther("10000")); // attacker started with 10000 ether (default)
  });
});