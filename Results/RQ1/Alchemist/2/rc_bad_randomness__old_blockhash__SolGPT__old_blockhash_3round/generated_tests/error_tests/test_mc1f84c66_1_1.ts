import { expect } from "chai";
import { ethers } from "hardhat";
import { network } from "hardhat";

describe("PredictTheBlockHashChallenge mutant test", function () {
  it("should kill mutant mc1f84c66 by verifying correct guess pays out, not incorrect guess", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const contract = await Factory.deploy({ value: ethers.parseEther("1") });
    await contract.waitForDeployment();

    // Player locks in 1 ether and guesses the hash of block number 1 (block after lock-in)
    const targetBlock = 1;
    const blockHash = ethers.keccak256(
      ethers.toUtf8Bytes(ethers.toBeHex(targetBlock))
    );
    // We need a real blockhash, so we mine blocks and capture actual blockhash
    await network.provider.send("evm_mine");
    const block = await ethers.provider.getBlock("latest");
    const realBlockHash = block.hash;

    // Player locks in a correct guess (the actual blockhash of block 1)
    await contract.connect(player).lockInGuess(realBlockHash, {
      value: ethers.parseEther("1"),
    });

    // Mine blocks until we pass the target block
    await network.provider.send("evm_mine");

    // Get player balance before settle
    const balanceBefore = await ethers.provider.getBalance(player.address);

    // Settle the guess
    const tx = await contract.connect(player).settle();
    const receipt = await tx.wait();

    // Get player balance after settle
    const balanceAfter = await ethers.provider.getBalance(player.address);

    // In original contract, correct guess should pay 2 ether
    // In mutant (== changed to !=), correct guess would NOT pay
    // So we assert that player gained ether (original behavior) vs mutant would fail this
    expect(balanceAfter - balanceBefore).to.equal(ethers.parseEther("2"));
  });
});