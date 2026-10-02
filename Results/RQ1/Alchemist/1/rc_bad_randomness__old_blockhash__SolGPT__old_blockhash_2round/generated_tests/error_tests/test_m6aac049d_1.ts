import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when settling without a prior lockInGuess (kills mutant m6aac049d)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();

    // addr1 has NOT called lockInGuess, so guesses[addr1].block is 0
    // Original contract requires guesses[msg.sender].block != 0, so it reverts
    // Mutant removes this require, so it would not revert (killing the mutant)
    await expect(
      instance.connect(addr1).settle()
    ).to.be.reverted;
  });
});