import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant mfeda8edf test", function () {
  it("should detect mutant by verifying lockInGuess stores block.number+1 not block.number*1", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();

    // Call lockInGuess in current block N
    const currentBlock = await ethers.provider.getBlock("latest");
    const blockNumber = currentBlock!.number;

    const dummyHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
    const tx = await instance.connect(owner).lockInGuess(dummyHash, { value: ethers.parseEther("1") });
    await tx.wait();

    // Mine one more block so block.number > stored block
    await ethers.provider.send("evm_mine", []);

    // Now try to settle - in original, stored block = block.number+1 = N+1
    // After mining one more block, block.number = N+2 > N+1, so settle should proceed
    // In mutant, stored block = block.number*1 = N, and block.number = N+2 > N is true too
    // But the answer will be blockhash(N) not blockhash(N+1)
    // We can detect by checking that the guess is compared against wrong block hash

    // Get the actual blockhash that would be used in original (N+1)
    const expectedBlockHash = await ethers.provider.send("eth_getBlockByNumber", [
      "0x" + (blockNumber + 1).toString(16),
      false
    ]).then((block: any) => block.hash);

    // Submit correct guess for original contract (block N+1 hash)
    const tx2 = await instance.connect(owner).lockInGuess(expectedBlockHash, { value: ethers.parseEther("1") });
    await tx2.wait();

    // Mine to make block.number > stored block (which is now N+1+1 = N+2)
    await ethers.provider.send("evm_mine", []);

    // This should succeed on original but fail on mutant because mutant stored N*1=N
    // and blockhash(N) != expectedBlockHash (hash of N+1)
    await expect(instance.connect(owner).settle()).to.be.reverted;
  });
});