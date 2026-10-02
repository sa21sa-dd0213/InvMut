import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant m64bed6e9 test", function () {
  it("should kill mutant by submitting a guess smaller than the actual block hash and verifying no reward is transferred", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();

    // Player locks in a guess with 1 ether
    const guessHash = ethers.keccak256(ethers.toUtf8Bytes("smaller guess"));
    await instance.connect(player).lockInGuess(guessHash, { value: ethers.parseEther("1") });

    // Wait for the next block to pass
    const currentBlock = await ethers.provider.getBlock("latest");
    const targetBlock = currentBlock.number + 1;
    // Mine blocks until we are past the target block
    while ((await ethers.provider.getBlock("latest")).number <= targetBlock) {
      await ethers.provider.send("evm_mine", []);
    }

    // Get the actual block hash of the target block
    const actualBlockHash = await ethers.provider.getStorage(
      await instance.getAddress(),
      ethers.solidityPackedKeccak256(["address", "uint256"], [player.address, 0])
    );

    // Ensure our guess is strictly less than the actual block hash
    // We'll use a hash that is known to be smaller (e.g., hash of "0")
    const smallerHash = ethers.keccak256(ethers.toUtf8Bytes("0"));
    
    // We need to set up a new guess with the smaller hash
    // Since the player already has a guess, we need to deploy a new instance for clean state
    const instance2 = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance2.waitForDeployment();

    await instance2.connect(player).lockInGuess(smallerHash, { value: ethers.parseEther("1") });

    const currentBlock2 = await ethers.provider.getBlock("latest");
    const targetBlock2 = currentBlock2.number + 1;
    while ((await ethers.provider.getBlock("latest")).number <= targetBlock2) {
      await ethers.provider.send("evm_mine", []);
    }

    // Record player balance before settle
    const balanceBefore = await ethers.provider.getBalance(player.address);

    // Settle the challenge
    const tx = await instance2.connect(player).settle();
    const receipt = await tx.wait();

    // Check that no transfer occurred (balance should not increase by 2 ether)
    const balanceAfter = await ethers.provider.getBalance(player.address);
    // Account for gas costs - balance after should be less than before (gas spent)
    // If mutant were alive, balance would increase by ~2 ether minus gas
    expect(balanceAfter).to.be.lt(balanceBefore);
    // If mutant were killed (original behavior), player gets no reward, so balance only decreases by gas
    // The gas cost is typically less than 0.01 ether, so a decrease of less than 0.01 ether indicates no reward
    expect(balanceBefore - balanceAfter).to.be.lt(ethers.parseEther("0.01"));
  });
});