import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge - kill mutant m56d7a580", function () {
  it("should kill mutant that changes >= to == in settle function by having extra balance", async function () {
    const [owner, player1, player2] = await ethers.getSigners();

    // Deploy contract with 1 ETH
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();

    // Player1 locks in a guess (we'll make it correct later by mining)
    const lockTx1 = await instance.connect(player1).lockInGuess(
      ethers.keccak256(ethers.toUtf8Bytes("placeholder")),
      { value: ethers.parseEther("1") }
    );
    await lockTx1.wait();

    // Player2 also locks in a guess (adding extra balance to the contract)
    const lockTx2 = await instance.connect(player2).lockInGuess(
      ethers.keccak256(ethers.toUtf8Bytes("another")),
      { value: ethers.parseEther("1") }
    );
    await lockTx2.wait();

    // Mine a block to advance past the guess block
    await ethers.provider.send("evm_mine", []);

    // Player1 settles - contract now has 3 ETH total (1 deploy + 2 from players)
    // Original: require(balance >= 2) passes, mutant: require(balance == 2) fails
    await expect(
      instance.connect(player1).settle()
    ).to.be.reverted;
  });
});