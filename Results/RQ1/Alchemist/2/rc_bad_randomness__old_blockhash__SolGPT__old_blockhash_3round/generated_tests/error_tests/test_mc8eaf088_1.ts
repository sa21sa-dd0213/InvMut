import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant mc8eaf088 test", function () {
  it("should detect mutant by settling immediately after lock-in (block.number < guesses[msg.sender].block)", async function () {
    const [owner, player] = await ethers.getSigners();
    
    // Deploy contract with 1 ETH
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();
    
    // Player locks in a guess with 1 ETH
    const guessHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
    const lockTx = await instance.connect(player).lockInGuess(guessHash, { value: ethers.parseEther("1") });
    await lockTx.wait();
    
    // Immediately try to settle (before any new block is mined)
    // In the original contract this would revert because block.number <= guesses[msg.sender].block
    // In the mutant with < instead of >, this should succeed and pay out 2 ETH
    const playerBalanceBefore = await ethers.provider.getBalance(player.address);
    
    const settleTx = await instance.connect(player).settle();
    await settleTx.wait();
    
    const playerBalanceAfter = await ethers.provider.getBalance(player.address);
    
    // The mutant allows settlement to succeed and transfer 2 ETH
    // The original would revert, so if we get here without revert and balance increased, mutant is killed
    expect(playerBalanceAfter).to.be.greaterThan(playerBalanceBefore);
  });
});