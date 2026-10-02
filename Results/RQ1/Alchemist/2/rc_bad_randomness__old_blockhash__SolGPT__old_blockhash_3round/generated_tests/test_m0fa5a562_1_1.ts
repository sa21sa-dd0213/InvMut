import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge - kill mutant m0fa5a562", function () {
  it("should kill the mutant that replaces keccak256 with sha256", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy with exactly 1 ether
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();

    // Lock in a guess at block N
    const lockBlock = await ethers.provider.getBlockNumber();
    const lockTx = await instance.connect(attacker).lockInGuess(
      ethers.ZeroHash,
      { value: ethers.parseEther("1") }
    );
    await lockTx.wait();

    // Mine two blocks so block.number > locked block
    await ethers.provider.send("evm_mine", []);
    await ethers.provider.send("evm_mine", []);

    // Compute the expected guess using keccak256 as in the original contract
    const lockedBlock = lockBlock + 1;
    const block = await ethers.provider.getBlock(lockedBlock);
    const actualBlockHash = block.hash;
    const expectedGuess = ethers.solidityPackedKeccak256(
      ["bytes32"],
      [actualBlockHash]
    );

    // Deploy a fresh contract for the correct guess
    const Factory2 = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance2 = await Factory2.deploy({ value: ethers.parseEther("1") });
    await instance2.waitForDeployment();

    // Lock with correct keccak256 guess
    const lockBlock2 = await ethers.provider.getBlockNumber();
    const lockTx2 = await instance2.connect(attacker).lockInGuess(
      expectedGuess,
      { value: ethers.parseEther("1") }
    );
    await lockTx2.wait();

    // Mine to pass the locked block
    await ethers.provider.send("evm_mine", []);
    await ethers.provider.send("evm_mine", []);

    const balBefore = await ethers.provider.getBalance(attacker.address);

    // Settle - in original this should succeed and transfer 2 ether
    // In mutant, sha256 will produce different hash, so no transfer
    await instance2.connect(attacker).settle();

    const balAfter = await ethers.provider.getBalance(attacker.address);

    // If original, attacker gained 2 ether. If mutant, no gain.
    // This test will fail (kill the mutant) because the balance difference
    // will be less than 2 ether in the mutant version
    expect(balAfter - balBefore).to.be.gt(ethers.parseEther("1.9"));
  });
});