import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge - kill mutant md637c518", function () {
  it("should kill mutant by locking in guess and settling after exactly one block", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();

    const guessHash = ethers.keccak256(ethers.toUtf8Bytes("test guess"));

    // Player locks in guess with 1 ether
    await instance.connect(player).lockInGuess(guessHash, { value: ethers.parseEther("1") });

    // Mine exactly one block
    await ethers.provider.send("evm_mine", []);

    // Settle the guess - should succeed on original but fail on mutant
    // because mutant stores block.number + 2 instead of block.number + 1
    const settleTx = await instance.connect(player).settle();
    const receipt = await settleTx.wait();

    // Verify the settlement actually transferred 2 ether (original behavior)
    // On mutant, the blockhash lookup will return zero bytes, guess won't match
    // and no transfer occurs - the transaction still succeeds but balance doesn't change
    const playerBalance = await ethers.provider.getBalance(player.address);
    
    // Original: player receives 2 ether (total 3 ether: 1 deposit + 2 reward)
    // Mutant: player only has their initial 1 ether returned (no reward)
    expect(playerBalance).to.equal(ethers.parseEther("3"));
  });
});