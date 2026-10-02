import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant detection", function () {
  it("should detect mutant that removes constructor require(msg.value == 1 ether)", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy the contract with 0 ether (mutant allows this, original would revert)
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: 0 });
    await instance.waitForDeployment();

    // Lock in a guess with 1 ether
    const guessHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
    await instance.connect(addr1).lockInGuess(guessHash, { value: ethers.parseEther("1") });

    // Mine blocks to satisfy the block.number > guesses[addr1].block condition
    const currentBlock = await ethers.provider.getBlockNumber();
    const targetBlock = currentBlock + 2;
    while ((await ethers.provider.getBlockNumber()) < targetBlock) {
      await ethers.provider.send("evm_mine", []);
    }

    // Attempt to settle - should revert because contract has no balance to pay 2 ether
    await expect(instance.connect(addr1).settle()).to.be.reverted;
  });
});