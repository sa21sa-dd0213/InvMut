import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant detection - m16e102ae", function () {
  it("should kill mutant by deploying without ether and expecting settle to fail due to insufficient balance", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    
    // Deploy WITHOUT sending ether (mutant removed the require(msg.value == 1 ether))
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Lock in a guess with exactly 1 ether
    const guessHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
    const lockTx = await instance.connect(owner).lockInGuess(guessHash, { value: ethers.parseEther("1") });
    await lockTx.wait();
    
    // Mine to the next block to satisfy the block.number > guesses[msg.sender].block condition
    await ethers.provider.send("evm_mine", []);
    
    // Attempt to settle - should revert because contract has no balance (0 ether) to pay 2 ether
    await expect(instance.connect(owner).settle()).to.be.reverted;
  });
});