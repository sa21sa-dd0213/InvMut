import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant m3b31f445", function () {
  it("should kill the mutant by deploying with 0 ether and proving the contract balance is insufficient for the transfer in settle()", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the contract WITHOUT sending any ether (mutant allows this)
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy();  // No value sent - mutant removed the require
    await instance.waitForDeployment();
    
    // Verify initial balance is 0 (mutant deployed without ether)
    expect(await ethers.provider.getBalance(await instance.getAddress())).to.equal(0n);
    
    // Lock in a guess from addr1 with 1 ether
    const guessHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
    await instance.connect(addr1).lockInGuess(guessHash, { value: ethers.parseEther("1") });
    
    // Advance blocks so settlement can occur
    const currentBlock = await ethers.provider.getBlockNumber();
    const targetBlock = currentBlock + 2; // block.number > guesses[addr1].block
    while ((await ethers.provider.getBlockNumber()) < targetBlock) {
      await ethers.provider.send("evm_mine", []);
    }
    
    // Try to settle - should revert because contract balance (1 ether) < 2 ether required
    await expect(
      instance.connect(addr1).settle()
    ).to.be.reverted;
    
    // Additionally verify the contract balance is exactly 1 ether (not 2)
    expect(await ethers.provider.getBalance(await instance.getAddress())).to.equal(ethers.parseEther("1"));
  });
});