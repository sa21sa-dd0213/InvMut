import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant kill test", function () {
  it("should revert settle when contract balance is less than 2 ether (mutant mee7a555d)", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy with exactly 1 ether (constructor requires 1 ether)
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1.0") });
    await instance.waitForDeployment();

    // Attacker locks in a guess (pays 1 ether)
    const dummyHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
    const lockTx = await instance.connect(attacker).lockInGuess(dummyHash, { value: ethers.parseEther("1.0") });
    await lockTx.wait();

    // Mine blocks to advance past the target block
    const currentBlock = await ethers.provider.getBlockNumber();
    const targetBlock = currentBlock + 1; // block was set to block.number + 1
    while ((await ethers.provider.getBlockNumber()) <= targetBlock) {
      await ethers.provider.send("evm_mine", []);
    }

    // Contract balance is now exactly 1 ether (attacker's deposit) - less than 2 ether
    // Original contract would revert here, mutant would not
    await expect(
      instance.connect(attacker).settle()
    ).to.be.reverted;
  });
});