import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant detection", function () {
  it("should detect the > vs >= mutant by settling with exactly 2 ether balance", async function () {
    const [owner, player] = await ethers.getSigners();
    
    // Deploy with exactly 1 ether (required by constructor)
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();
    
    // Fund contract with an additional 1 ether to make total balance exactly 2 ether
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1")
    });
    
    // Player locks in a guess
    const guessHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
    await instance.connect(player).lockInGuess(guessHash, { value: ethers.parseEther("1") });
    
    // Advance block number past the locked block
    // Mine blocks to ensure block.number > guesses[player].block
    const currentBlock = await ethers.provider.getBlockNumber();
    const playerGuessBlock = currentBlock + 1;
    
    // Wait for enough blocks to pass
    while (await ethers.provider.getBlockNumber() <= playerGuessBlock) {
      await ethers.provider.send("evm_mine", []);
    }
    
    // Settle - on original this succeeds with >= 2 ether, on mutant it reverts with > 2 ether
    await expect(instance.connect(player).settle()).to.be.reverted;
  });
});